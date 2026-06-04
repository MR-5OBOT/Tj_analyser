import React from "react";
import { Switch, Text, TextInput, View } from "react-native";

import { CANONICAL_COLUMNS, CanonicalColumn } from "../constants";
import { palette, styles } from "../theme";

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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>Mapping</Text>
          <Text style={styles.sectionTitle}>Manual columns</Text>
        </View>
        <Switch value={open} onValueChange={onToggle} trackColor={{ true: palette.accent }} />
      </View>
      <Text style={styles.helperText}>
        Use this only if auto-detect misses your headers.
      </Text>

      {open ? (
        <View style={styles.mappingGrid}>
          {CANONICAL_COLUMNS.map((column) => (
            <View key={column} style={styles.mappingRow}>
              <Text style={styles.mappingLabel}>{column}</Text>
              <TextInput
                style={styles.mappingInput}
                value={value[column]}
                onChangeText={(text) => onChange(column, text)}
                placeholder="Exact journal column name"
                placeholderTextColor="#5E5E5E"
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
