import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import { LoadingScreen } from '../components/ui';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { colors, spacing, fontSize } from '../theme';
import type { Dossier } from '../types';

type FormState = {
  customerName: string;
  customerCin: string;
  customerPhone: string;
  customerAddress: string;
  peakPowerKwc: string;
  panelCount: string;
  panelBrand: string;
  inverterModel: string;
  dcCableLength: string;
  acCableLength: string;
  acPhase: 'mono' | 'tri';
};

const EMPTY_FORM: FormState = {
  customerName: '',
  customerCin: '',
  customerPhone: '',
  customerAddress: '',
  peakPowerKwc: '3',
  panelCount: '8',
  panelBrand: '',
  inverterModel: '',
  dcCableLength: '20',
  acCableLength: '10',
  acPhase: 'mono',
};

function toNumber(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function DossierFormScreen({ route }: { route?: { params?: { id?: string } } }) {
  const navigation = useNavigation<any>();
  const isEdit = Boolean(route?.params?.id);
  const id = route?.params?.id;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, loading, error } = useAsync<Dossier | undefined>(() => (id ? api.getDossier(id) : Promise.resolve(undefined)), [id]);

  useEffect(() => {
    if (!data) return;
    setForm({
      customerName: data.customerDetails?.name || '',
      customerCin: data.customerDetails?.cin || '',
      customerPhone: data.customerDetails?.phone || '',
      customerAddress: data.customerDetails?.address || '',
      peakPowerKwc: String(data.pvSystemParams?.peakPowerKwc ?? '3'),
      panelCount: String(data.pvSystemParams?.panelCount ?? '8'),
      panelBrand: data.pvSystemParams?.panelBrand || '',
      inverterModel: data.pvSystemParams?.inverterModel || '',
      dcCableLength: String(data.pvSystemParams?.dcCableLength ?? '20'),
      acCableLength: String(data.pvSystemParams?.acCableLength ?? '10'),
      acPhase: (data.pvSystemParams?.acPhase as 'mono' | 'tri') || 'mono',
    });
  }, [data]);

  const canSubmit = useMemo(() => {
    return !!form.customerName.trim() && !!form.customerPhone.trim() && +toNumber(form.peakPowerKwc, 0) > 0;
  }, [form]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onSubmit() {
    if (!canSubmit) {
      setSubmitError('Veuillez renseigner au minimum le nom, le téléphone et la puissance du dossier.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        customerDetails: {
          name: form.customerName.trim(),
          cin: form.customerCin.trim(),
          phone: form.customerPhone.trim(),
          address: form.customerAddress.trim(),
          stegMeterRef: 'À renseigner',
        },
        pvSystemParams: {
          peakPowerKwc: toNumber(form.peakPowerKwc, 0),
          panelCount: Math.max(1, Math.round(toNumber(form.panelCount, 8))),
          panelBrand: form.panelBrand.trim() || 'Non renseigné',
          inverterModel: form.inverterModel.trim() || 'Non renseigné',
          dcCableLength: toNumber(form.dcCableLength, 20),
          acCableLength: toNumber(form.acCableLength, 10),
          acPhase: form.acPhase,
        },
        equipment: {},
      };

      if (isEdit && id) {
        const updated = await api.updateDossier(id, payload);
        navigation.navigate('DossierDetail', { id: updated._id || id });
      } else {
        const created = await api.createDossier(payload);
        navigation.navigate('DossierDetail', { id: created._id });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && isEdit) {
    return (
      <Screen title={isEdit ? 'Modifier le dossier' : 'Nouveau dossier'} subtitle="Chargement...">
        <LoadingScreen label="Chargement du dossier..." />
      </Screen>
    );
  }

  return (
    <Screen title={isEdit ? 'Modifier le dossier' : 'Nouveau dossier'} subtitle={isEdit ? 'Mise à jour du dossier' : 'Créer un dossier technique'}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card>
          <CardTitle subtitle="Informations client">Client</CardTitle>
          <View style={styles.fields}>
            <FormField label="Nom du client" value={form.customerName} onChangeText={(v) => setForm((prev) => ({ ...prev, customerName: v }))} placeholder="Ex. Ahmed Ben Salah" />
            <FormField label="CIN" value={form.customerCin} onChangeText={(v) => setForm((prev) => ({ ...prev, customerCin: v }))} placeholder="Ex. AB123456" />
            <FormField label="Téléphone" value={form.customerPhone} onChangeText={(v) => setForm((prev) => ({ ...prev, customerPhone: v }))} placeholder="Ex. +216 12 345 678" keyboardType="phone-pad" />
            <FormField label="Adresse" value={form.customerAddress} onChangeText={(v) => setForm((prev) => ({ ...prev, customerAddress: v }))} placeholder="Adresse complète" multiline />
          </View>
        </Card>

        <Card>
          <CardTitle subtitle="Paramètres PV">Installation</CardTitle>
          <View style={styles.fields}>
            <FormField label="Puissance (kWc)" value={form.peakPowerKwc} onChangeText={(v) => setForm((prev) => ({ ...prev, peakPowerKwc: v }))} keyboardType="numeric" />
            <FormField label="Nombre de panneaux" value={form.panelCount} onChangeText={(v) => setForm((prev) => ({ ...prev, panelCount: v }))} keyboardType="numeric" />
            <FormField label="Marque des panneaux" value={form.panelBrand} onChangeText={(v) => setForm((prev) => ({ ...prev, panelBrand: v }))} placeholder="Ex. JinkoSolar" />
            <FormField label="Modèle de l’onduleur" value={form.inverterModel} onChangeText={(v) => setForm((prev) => ({ ...prev, inverterModel: v }))} placeholder="Ex. Growatt 3000S" />
            <FormField label="Longueur câble DC (m)" value={form.dcCableLength} onChangeText={(v) => setForm((prev) => ({ ...prev, dcCableLength: v }))} keyboardType="numeric" />
            <FormField label="Longueur câble AC (m)" value={form.acCableLength} onChangeText={(v) => setForm((prev) => ({ ...prev, acCableLength: v }))} keyboardType="numeric" />
            <View style={styles.phaseRow}>
              <Text style={styles.phaseLabel}>Phase AC</Text>
              <View style={styles.phaseButtons}>
                {(['mono', 'tri'] as const).map((phase) => (
                  <Button
                    key={phase}
                    label={phase === 'mono' ? 'Monophasé' : 'Triphasé'}
                    variant={form.acPhase === phase ? 'primary' : 'secondary'}
                    onPress={() => setForm((prev) => ({ ...prev, acPhase: phase }))}
                    style={styles.phaseButton}
                  />
                ))}
              </View>
            </View>
          </View>
        </Card>

        {submitError ? (
          <Card>
            <Text style={styles.error}>{submitError}</Text>
          </Card>
        ) : null}

        {error ? (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : null}

        <View style={styles.footer}>
          <Button label={isEdit ? 'Enregistrer les modifications' : 'Créer le dossier'} onPress={onSubmit} loading={submitting} disabled={!canSubmit || submitting} />
          <Button label="Annuler" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing[8], gap: spacing[4] },
  fields: { gap: spacing[3] },
  phaseRow: { gap: spacing[2] },
  phaseLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.muted },
  phaseButtons: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  phaseButton: { minHeight: 40, flexShrink: 1 },
  footer: { gap: spacing[3] },
  error: { color: colors.dangerDeep, fontSize: fontSize.sm },
});
