import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Placeholder banner ad component.
 *
 * TODO (Level 2): Replace with a real ad SDK banner.
 *   Options:
 *   - Google AdMob via `react-native-google-mobile-ads`
 *   - AppLovin MAX via `react-native-applovin-max`
 *
 * Props:
 *   enabled {boolean} – renders nothing when false
 */
export default function AdBanner({ enabled }) {
  if (!enabled) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>📢 AD PLACEHOLDER</Text>
      <Text style={styles.sub}>TODO: Integrate AdMob / AppLovin banner here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 60,
    backgroundColor: '#FFF9C4',
    borderWidth: 1,
    borderColor: '#F9A825',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    paddingHorizontal: 8,
  },
  label: {
    fontWeight: '700',
    color: '#795500',
    fontSize: 12,
  },
  sub: {
    color: '#795500',
    fontSize: 10,
    marginTop: 2,
  },
});
