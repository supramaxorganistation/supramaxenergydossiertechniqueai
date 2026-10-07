import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import { erpApi } from '../lib/erpApi';
import type { SystemType } from '../erpTypes';
import { colors, spacing, fontSize } from '../theme';

export default function InstallationCreateScreen() {
  const navigation = useNavigation<any>();

  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [powerKwc, setPowerKwc] = useState('');
  const [systemType, setSystemType] = useState<SystemType>('on_grid');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    try {
      setLoading(true);
      setError(null);

      if (!title.trim()) throw new Error('Le titre du chantier est obligatoire.');
      if (!customerId.trim()) throw new Error('L’identifiant du client est obligatoire.');

      const normalizedSystemType: SystemType = ['on_grid', 'hybrid', 'off_grid'].includes(systemType)
        ? (systemType as SystemType)
        : 'on_grid';

      await erpApi.createInstallation({
        title: title.trim(),
        customerId: customerId.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        governorate: governorate.trim() || undefined,
        powerKwc: Number(powerKwc || 0),
        systemType: normalizedSystemType,
        notes: notes.trim() || undefined,
      });

      navigation.navigate('Main', { screen: 'Installations' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du chantier.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Nouveau chantier" subtitle="Créer une installation photovoltaïque">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card>
          <CardTitle subtitle="Informations de base">Chantier</CardTitle>

          <View style={styles.fields}>
            <FormField
              label="Titre du chantier"
              value={title}
              onChangeText={setTitle}
              placeholder="Ex. Installation résidentielle Sfax"
            />
            <FormField
              label="ID client"
              value={customerId}
              onChangeText={setCustomerId}
              placeholder="ID Mongo du client"
              autoCapitalize="none"
            />
            <FormField
              label="Adresse"
              value={address}
              onChangeText={setAddress}
              placeholder="Adresse complète"
              multiline
            />
            <FormField label="Ville" value={city} onChangeText={setCity} placeholder="Sfax" />
            <FormField label="Gouvernorat" value={governorate} onChangeText={setGovernorate} placeholder="Sfax" />
            <FormField
              label="Puissance (kWc)"
              value={powerKwc}
              onChangeText={setPowerKwc}
              placeholder="5.4"
              keyboardType="decimal-pad"
            />
            <FormField
              label="Type de système"
              value={systemType}
              onChangeText={(value) => setSystemType(value as SystemType)}
              placeholder="on_grid"
              autoCapitalize="none"
            />
            <FormField
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Informations complémentaires"
              multiline
            />
          </View>
        </Card>

        {error ? (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button label={loading ? 'Création...' : 'Créer le chantier'} onPress={handleSubmit} loading={loading} />
          <Button label="Annuler" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing[8], gap: spacing[4] },
  fields: { gap: spacing[3] },
  actions: { gap: spacing[3] },
  error: { color: colors.dangerDeep, fontSize: fontSize.sm },
});
