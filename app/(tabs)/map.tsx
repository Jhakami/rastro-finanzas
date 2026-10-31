import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, GeoJSONSource, Layer, Map as MapLibreMap } from '@maplibre/maplibre-react-native';
import { formatPEN } from '@/domain/money';
import { Card, Chip, EmptyState, ScreenHeader, LoadingView } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';
import { reportingRepository } from '@/infrastructure/reporting-repository';
import { useLocalQuery } from '@/presentation/use-local-query';

export default function MapScreen() {
  const { revision } = useFinance();
  const result = useLocalQuery(
    useCallback(() => reportingRepository.zones(), []),
    revision,
  );
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [weight, setWeight] = useState<'amount' | 'count'>('amount');
  const zones = useMemo(() => result.data ?? [], [result.data]);
  const geoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: zones.map((zone) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [zone.longitude, zone.latitude] },
        properties: { weight: weight === 'amount' ? zone.amount : zone.count },
      })),
    }),
    [zones, weight],
  );
  const center = zones[0]
    ? ([zones[0].longitude, zones[0].latitude] as [number, number])
    : ([-77.0428, -12.0464] as [number, number]);

  if (result.loading) return <LoadingView />;
  if (result.error)
    return (
      <SafeAreaView style={styles.safe}>
        <Text accessibilityRole="alert" style={styles.zoneMeta}>
          {result.error}
        </Text>
        <Pressable accessibilityRole="button" onPress={result.retry}>
          <Text style={styles.zoneTitle}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <ScreenHeader eyebrow="Contexto, no seguimiento" title="Zonas de compra" />
        <View style={styles.controls}>
          <View style={styles.row}>
            <Chip label="Mapa" selected={mode === 'map'} onPress={() => setMode('map')} />
            <Chip label="Lista" selected={mode === 'list'} onPress={() => setMode('list')} />
          </View>
          <View style={styles.row}>
            <Chip
              label="Por monto"
              selected={weight === 'amount'}
              onPress={() => setWeight('amount')}
            />
            <Chip
              label="Por cantidad"
              selected={weight === 'count'}
              onPress={() => setWeight('count')}
            />
          </View>
        </View>
        {result.error ? (
          <Text accessibilityRole="alert" style={styles.zoneMeta}>
            {result.error}
          </Text>
        ) : null}
        {!zones.length && !result.error ? (
          <Card>
            <EmptyState
              icon="location-outline"
              title="Sin zonas guardadas"
              body="Activa la zona aproximada al registrar una compra. La ubicación precisa se descarta inmediatamente."
            />
          </Card>
        ) : mode === 'map' ? (
          <View style={styles.mapWrap}>
            <MapLibreMap
              style={styles.map}
              mapStyle="https://tiles.openfreemap.org/styles/dark"
              attribution
              logo={false}
            >
              <Camera initialViewState={{ center, zoom: 12 }} />
              <GeoJSONSource id="purchase-zones" data={geoJson}>
                <Layer
                  id="purchase-heat"
                  type="heatmap"
                  style={{
                    heatmapRadius: 32,
                    heatmapOpacity: 0.82,
                    heatmapIntensity: 1.1,
                    heatmapColor: [
                      'interpolate',
                      ['linear'],
                      ['heatmap-density'],
                      0,
                      'rgba(148,226,213,0)',
                      0.35,
                      colors.sky,
                      0.65,
                      colors.peach,
                      1,
                      colors.red,
                    ],
                  }}
                />
              </GeoJSONSource>
            </MapLibreMap>
            <View style={styles.privacy}>
              <Text style={styles.privacyText}>Solo celdas aproximadas de 50 m</Text>
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {zones.map((zone, index) => (
              <Card key={zone.id} style={styles.zone}>
                <Text style={styles.rank}>{index + 1}</Text>
                <View style={styles.zoneText}>
                  <Text style={styles.zoneTitle}>{zone.label}</Text>
                  <Text style={styles.zoneMeta}>
                    {zone.count} compra{zone.count === 1 ? '' : 's'} · celda de 50 m
                  </Text>
                </View>
                <Text style={styles.zoneAmount}>{formatPEN(zone.amount)}</Text>
              </Card>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.md },
  controls: { gap: 8, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  mapWrap: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  map: { flex: 1 },
  privacy: {
    position: 'absolute',
    left: 12,
    bottom: 24,
    backgroundColor: '#11111BDD',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  privacyText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  list: { gap: 8, paddingBottom: 100 },
  zone: { flexDirection: 'row', alignItems: 'center' },
  rank: {
    width: 34,
    height: 34,
    lineHeight: 34,
    textAlign: 'center',
    borderRadius: 17,
    color: colors.green,
    fontWeight: '900',
    backgroundColor: colors.greenSoft,
  },
  zoneText: { flex: 1, marginLeft: 12 },
  zoneTitle: { color: colors.ink, fontWeight: '800' },
  zoneMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  zoneAmount: { color: colors.ink, fontWeight: '900' },
});
