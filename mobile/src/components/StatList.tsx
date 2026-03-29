import React from "react";
import { Text, View } from "react-native";

import { styles } from "../theme";

type Props = {
  stats: Record<string, string | number>;
};

export function StatList({ stats }: Props) {
  return (
    <View>
      {Object.entries(stats).map(([label, value]) => (
        <View key={label} style={styles.statRow}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statValue}>{String(value)}</Text>
        </View>
      ))}
    </View>
  );
}
