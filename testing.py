import numpy as np
import pandas as pd

df = pd.read_excel("./data/journals_for_data_analysis.xlsx") # index_col=0

# num_rows = len(df)
#
# df.insert(loc=6, column="wins", value=np.random.randint(0, 2, size=num_rows))
#
# df.insert(loc=7, column="losses", value=np.random.randint(0, 2, size=num_rows))

# df.to_excel("./data/journals_for_data_analysis.xlsx", index=False)

print(df.head())
# print(df.shape)
