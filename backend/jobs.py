"""A one-at-a-time render queue — the "coffee shop" model.

PDF rendering is CPU-bound matplotlib and uses pyplot's global state, so it can't
run concurrently (two renders would corrupt each other's figures). Instead of
fighting that, we embrace it: a single background worker processes jobs FIFO, one
at a time, off the event loop (so status polls stay responsive). Clients enqueue,
get a job_id, and poll for their place in line.

In-memory + single-process on purpose: this backend is one instance with one
barista. ponytail: if it ever runs multi-instance, swap this for a real broker.
"""

import asyncio
import time
from dataclasses import dataclass, field
from typing import Callable

from fastapi.concurrency import run_in_threadpool

from backend.logging_utils import get_logger

logger = get_logger("backend.jobs")

MAX_QUEUE = 10          # reject new jobs once this many are waiting/rendering
JOB_TTL_SECONDS = 600   # forget finished jobs after 10 minutes


@dataclass
class Job:
    id: str
    run: Callable[[], dict]      # the heavy work; returns the JSON-able result
    state: str = "queued"        # queued | rendering | done | error
    created: float = field(default_factory=time.monotonic)
    result: dict | None = None
    error: str | None = None


_jobs: dict[str, Job] = {}
_order: list[str] = []                       # active job ids (queued + rendering), FIFO
_queue: "asyncio.Queue[str] | None" = None   # created on startup, when a loop exists


def _prune() -> None:
    now = time.monotonic()
    for jid in [j for j, job in _jobs.items() if job.state in ("done", "error") and now - job.created > JOB_TTL_SECONDS]:
        _jobs.pop(jid, None)


def pending_count() -> int:
    """Jobs waiting or rendering right now."""
    return len(_order)


def submit(job_id: str, run: Callable[[], dict]) -> int:
    """Register + enqueue a job. Returns the number of jobs ahead of it.
    Raises RuntimeError('busy') if the queue is full."""
    _prune()
    if len(_order) >= MAX_QUEUE:
        raise RuntimeError("busy")
    _jobs[job_id] = Job(id=job_id, run=run)
    _order.append(job_id)
    assert _queue is not None, "worker not started"
    _queue.put_nowait(job_id)
    return len(_order) - 1  # how many are ahead (incl. the one rendering)


def status(job_id: str) -> dict | None:
    job = _jobs.get(job_id)
    if job is None:
        return None
    position = _order.index(job_id) if job_id in _order else 0  # 0 = front (rendering)
    return {"state": job.state, "position": position, "result": job.result, "error": job.error}


async def _worker() -> None:
    assert _queue is not None
    while True:
        job_id = await _queue.get()
        job = _jobs.get(job_id)
        if job is not None:
            job.state = "rendering"
            logger.info("job_started id=%s ahead=%s", job_id, len(_order) - 1)
            try:
                job.result = await run_in_threadpool(job.run)  # off the loop; one at a time → pyplot-safe
                job.state = "done"
                logger.info("job_done id=%s", job_id)
            except ValueError as exc:  # bad data — show the user the reason
                job.error = str(exc)
                job.state = "error"
                logger.warning("job_user_error id=%s detail=%s", job_id, exc)
            except Exception:
                job.error = "Unexpected server error while generating the report."
                job.state = "error"
                logger.exception("job_failed id=%s", job_id)
            if job_id in _order:
                _order.remove(job_id)
        _queue.task_done()


def start_worker() -> None:
    """Idempotent — call once on app startup (a running loop must exist)."""
    global _queue
    if _queue is None:
        _queue = asyncio.Queue()
        asyncio.create_task(_worker())
        logger.info("render_worker_started max_queue=%s", MAX_QUEUE)
