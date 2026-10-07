import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, CardTitle } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import { colors, spacing, fontSize } from '../theme';
import { erpApi } from '../lib/erpApi';

export type ErpCreateType = 'customer' | 'product';

export default function ErpCreateScreen({ route }: { route?: { params?: { type?: ErpCreateType; id?: string } } }) {
  const navigation = useNavigation<any>();
  const type = route?.params?.type ?? 'customer';
  const editId = route?.params?.id;
  const isCustomer = type === 'customer';
  const isEditMode = !!editId;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode) return;

    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (isCustomer) {
          const customer = await erpApi.getCustomer(editId!);
          if (!active) return;
          setName(customer.name || '');
          setEmail(customer.email || '');
          setPhone(customer.phone || '');
          setAddress(customer.address || '');
        } else {
          const product = await erpApi.listProducts();
          const found = product.find((item) => item._id === editId);
          if (!found) throw new Error('Produit introuvable.');
          if (!active) return;
          setName(found.name || '');
          setSku(found.sku || '');
          setPrice(String(found.sellingPrice ?? 0));
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Impossible de charger l’élément.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [editId, isCustomer, isEditMode]);

  async function handleSubmit() {
    try {
      setLoading(true);
      setError(null);

      if (isCustomer) {
        if (!name.trim()) throw new Error('Le nom du client est obligatoire.');
        const payload = {
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          customerGroup: 'individual' as const,
        };
        if (isEditMode) {
          await erpApi.updateCustomer(editId!, payload);
        } else {
          await erpApi.createCustomer(payload);
        }
        navigation.navigate('ErpCustomers');
        return;
      }

      if (!name.trim()) throw new Error('Le nom du produit est obligatoire.');
      const payload = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        sellingPrice: Number(price || 0),
        buyingPrice: Number(price || 0),
        category: 'other' as const,
        isActive: true,
      };
      if (isEditMode) {
        await erpApi.updateProduct(editId!, payload);
      } else {
        await erpApi.createProduct(payload);
      }
      navigation.navigate('ErpProducts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title={isEditMode ? (isCustomer ? 'Modifier client' : 'Modifier produit') : (isCustomer ? 'Nouveau client' : 'Nouveau produit')} subtitle={isCustomer ? 'Ajouter ou mettre à jour un client' : 'Ajouter ou mettre à jour un produit'}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card>
          <CardTitle subtitle={isCustomer ? 'Fiche client' : 'Fiche produit'}>{isCustomer ? 'Client' : 'Produit'}</CardTitle>
          <View style={styles.fields}>
            <FormField label={isCustomer ? 'Nom du client' : 'Nom du produit'} value={name} onChangeText={setName} placeholder={isCustomer ? 'Ex. Ahmed Ben Salah' : 'Ex. Panneau 540 W'} />
            {isCustomer ? (
              <>
                <FormField label="Email" value={email} onChangeText={setEmail} placeholder="client@email.com" keyboardType="email-address" autoCapitalize="none" />
                <FormField label="Téléphone" value={phone} onChangeText={setPhone} placeholder="+216 12 345 678" keyboardType="phone-pad" />
                <FormField label="Adresse" value={address} onChangeText={setAddress} placeholder="Adresse complète" multiline />
              </>
            ) : (
              <>
                <FormField label="SKU" value={sku} onChangeText={setSku} placeholder="SKU-001" autoCapitalize="characters" />
                <FormField label="Prix de vente (TND)" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />
              </>
            )}
          </View>
        </Card>

        {error ? (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button label={loading ? 'Enregistrement...' : (isEditMode ? 'Enregistrer les modifications' : 'Enregistrer')} onPress={handleSubmit} loading={loading} />
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
