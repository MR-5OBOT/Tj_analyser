"""Runnable check for the render queue (backend/jobs.py) without fastapi/pandas.

jobs.py's only third-party import is fastapi.concurrency.run_in_threadpool, so we
stub that (run the fn in a real thread, like the real one does) and exercise the
actual queue: FIFO order, one-at-a-time processing, place-in-line math, queue-full
rejection, and error surfacing. Run: python3 backend/jobs_smoke.py
"""
import asyncio
import os
import sys
import threading
import types

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root → import backend.*

# --- stub fastapi.concurrency before importing the module under test ---
_conc = types.ModuleType("fastapi.concurrency")
async def _run_in_threadpool(fn, *a, **k):  # mirrors the real one: runs fn in a thread
    return await asyncio.to_thread(fn, *a, **k)
_conc.run_in_threadpool = _run_in_threadpool
sys.modules["fastapi"] = types.ModuleType("fastapi")
sys.modules["fastapi.concurrency"] = _conc

import backend.jobs as jobs  # noqa: E402

passed = 0
def ok(msg):
    global passed
    passed += 1
    print("  ✓", msg)


async def drain():
    """Wait until no jobs are active (queue empty)."""
    for _ in range(500):
        if jobs.pending_count() == 0:
            return
        await asyncio.sleep(0.01)
    raise AssertionError("queue never drained")


async def wait_state(job_id, state):
    for _ in range(500):
        if jobs.status(job_id)["state"] == state:
            return
        await asyncio.sleep(0.01)
    raise AssertionError(f"{job_id} never reached {state}: {jobs.status(job_id)}")


async def main():
    jobs.start_worker()

    # 1. FIFO order, place-in-line, and strictly one-at-a-time
    gate = threading.Event()
    seen = []
    def make(tag):
        def run():
            gate.wait(2)        # hold so we can observe the line
            seen.append(tag)    # records the order renders actually run
            return {"tag": tag}
        return run
    p = [jobs.submit(t, make(t)) for t in ("a", "b", "c")]
    assert p == [0, 1, 2], f"submit should report jobs-ahead 0,1,2; got {p}"
    ok("submit returns the place in line (0, 1, 2)")

    await wait_state("a", "rendering")
    assert jobs.status("a")["position"] == 0
    assert jobs.status("b")["position"] == 1, jobs.status("b")
    assert jobs.status("c")["position"] == 2, jobs.status("c")
    ok("front job renders while the rest report their position")

    gate.set()
    await drain()
    assert seen == ["a", "b", "c"], f"renders must run FIFO one-at-a-time; got {seen}"
    ok("renders run FIFO, one at a time")
    assert jobs.status("a")["result"] == {"tag": "a"}
    ok("finished job exposes its result")

    # 2. a failing render surfaces as state=error with the message
    def boom():
        raise ValueError("bad data")
    jobs.submit("err", boom)
    await wait_state("err", "error")
    assert jobs.status("err")["error"] == "bad data"
    ok("a failed render surfaces state=error + message")
    await drain()

    # 3. queue-full rejection at MAX_QUEUE
    gate2 = threading.Event()
    def held():
        gate2.wait(2)
        return {}
    for i in range(jobs.MAX_QUEUE):
        jobs.submit(f"full{i}", held)
    try:
        jobs.submit("overflow", held)
        raise AssertionError("submit should reject past MAX_QUEUE")
    except RuntimeError:
        ok(f"rejects new jobs past MAX_QUEUE ({jobs.MAX_QUEUE})")
    gate2.set()
    await drain()

    print(f"\nALL {passed} CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(main())
