import React from "react";
import { Switch, Text, TextInput, View } from "react-native";

import { CANONICAL_COLUMNS, CanonicalColumn } from "../constants";
import { styles } from "../theme";

type Props = {
  value: Record<CanonicalColumn, string>;
  open: boolean;
  onToggle: (value: boolean) => void;
  onChange: (column: CanonicalColumn, value: string) => void;
};

export function MappingEditor({ value, open, onToggle, onChange }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.toggleRow}>
        <Text style={styles.sectionTitle}>Column Mapping</Text>
        <Switch value={open} onValueChange={onToggle} trackColor={{ true: "#466963" }} />
      </View>
      <Text style={styles.helperText}>
        Leave fields empty to let the backend auto-detect names like `date`, `asset`, `risk`, `reward`, and `win_loss`.
      </Text>

      {open && (
        <View style={styles.mappingGrid}>
          {CANONICAL_COLUMNS.map((column) => (
            <View key={column} style={styles.mappingRow}>
              <Text style={styles.mappingLabel}>{column}</Text>
              <TextInput
                style={styles.mappingInput}
                value={value[column]}
                onChangeText={(text) => onChange(column, text)}
                placeholder="Exact journal column name"
                placeholderTextColor="#7e8783"
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
