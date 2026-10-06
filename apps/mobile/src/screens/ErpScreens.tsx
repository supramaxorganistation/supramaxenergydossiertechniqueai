import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card } from '../components/Screen';
import { Badge, EmptyState, LoadingScreen, StatCard } from '../components/ui';
import { Button } from '../components/Button';
import { erpApi } from '../lib/erpApi';
import { useAsync } from '../lib/useAsync';
import { colors, spacing, fontSize } from '../theme';
import type { ErpStats, ErpCustomer, ErpProduct, ErpQuote, ErpSalesOrder, ErpPurchaseOrder, ErpStockMovement, ErpAccount, ErpEmployee, ErpSetting } from '../erpTypes';

function money(value?: number) {
  return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(value ?? 0);
}

function dateLabel(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

type GenericListProps<T> = {
  title: string;
  subtitle: string;
  fetcher: () => Promise<T[]>;
  emptyTitle: string;
  emptySubtitle?: string;
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  onCreate?: () => void;
};

function GenericListScreen<T>({ title, subtitle, fetcher, emptyTitle, emptySubtitle, renderItem, getKey, onCreate }: GenericListProps<T>) {
  const { data, loading, error, reload } = useAsync<T[]>(fetcher, []);
  const items = data ?? [];

  return (
    <Screen
      title={title}
      subtitle={subtitle}
      refreshing={loading}
      onRefresh={reload}
      headerRight={onCreate ? <Button label="+ Nouveau" onPress={onCreate} /> : undefined}
    >
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      {loading && !data ? (
        <LoadingScreen label={`Chargement ${title.toLowerCase()}...`} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon="inbox" title={emptyTitle} subtitle={emptySubtitle || 'Aucune donnée disponible actuellement.'} />
        </Card>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={getKey(item)}>{renderItem(item)}</View>
          ))}
        </View>
      )}
    </Screen>
  );
}

export function ErpDashboardScreen() {
  const { data, loading, error, reload } = useAsync<ErpStats>(() => erpApi.stats(), []);

  if (!data && loading) {
    return <Screen title="Aperçu ERP" subtitle="Vue synthétique"><LoadingScreen label="Chargement du tableau de bord..." /></Screen>;
  }

  return (
    <Screen title="Aperçu ERP" subtitle="Indicateurs du programme" refreshing={loading} onRefresh={reload}>
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      {data ? (
        <>
          <View style={styles.statGrid}>
            <StatCard icon="users" value={data.customerCount} label="Clients" color="blue" />
            <StatCard icon="box" value={data.productCount} label="Produits" color="green" />
            <StatCard icon="file-text" value={data.quoteCount} label="Devis" color="amber" />
            <StatCard icon="wallet" value={money(data.totalRevenue)} label="Revenus" color="red" />
          </View>

          <Card>
            <Text style={styles.sectionTitle}>Synthèse</Text>
            <View style={styles.summaryList}>
              <Text style={styles.summaryText}>Factures : {data.invoiceCount}</Text>
              <Text style={styles.summaryText}>Commandes clients : {data.salesOrderCount}</Text>
              <Text style={styles.summaryText}>Commandes fournisseurs : {data.purchaseOrderCount}</Text>
              <Text style={styles.summaryText}>Stock bas : {data.lowStockProducts}</Text>
              <Text style={styles.summaryText}>Dette restante : {money(data.totalOutstanding)}</Text>
              <Text style={styles.summaryText}>Factures en retard : {data.overdueInvoices}</Text>
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

export function ErpCustomersScreen() {
  const navigation = useNavigation<any>();
  return (
    <GenericListScreen<ErpCustomer>
      title="CRM"
      subtitle="Clients et prospects"
      fetcher={() => erpApi.listCustomers()}
      emptyTitle="Aucun client"
      emptySubtitle="Aucun client n’a encore été enregistré."
      getKey={(item) => item._id}
      onCreate={() => navigation.navigate('ErpCustomerCreate')}
      renderItem={(customer) => (
        <Pressable
          onPress={() => navigation.navigate('ErpCustomerEdit', { id: customer._id })}
          style={({ pressed }) => [styles.cardItem, pressed && styles.cardPressed]}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{customer.name}</Text>
            <Badge color="blue">{customer.customerGroup || 'individual'}</Badge>
          </View>
          <Text style={styles.cardMeta}>{customer.email || 'Email non renseigné'}</Text>
          <Text style={styles.cardMeta}>{customer.phone || 'Téléphone non renseigné'}</Text>
        </Pressable>
      )}
    />
  );
}

export function ErpProductsScreen() {
  const navigation = useNavigation<any>();
  return (
    <GenericListScreen<ErpProduct>
      title="Produits"
      subtitle="Catalogue de matériel"
      fetcher={() => erpApi.listProducts()}
      emptyTitle="Aucun produit"
      emptySubtitle="Le catalogue est vide pour le moment."
      getKey={(item) => item._id}
      onCreate={() => navigation.navigate('ErpProductCreate')}
      renderItem={(product) => (
        <Pressable
          onPress={() => navigation.navigate('ErpProductEdit', { id: product._id })}
          style={({ pressed }) => [styles.cardItem, pressed && styles.cardPressed]}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{product.name}</Text>
            <Badge color={product.stockQty && product.stockQty <= (product.minStockQty ?? 0) ? 'red' : 'green'}>{product.stockQty ?? 0} en stock</Badge>
          </View>
          <Text style={styles.cardMeta}>SKU : {product.sku || '—'}</Text>
          <Text style={styles.cardMeta}>Prix : {money(product.sellingPrice)}</Text>
        </Pressable>
      )}
    />
  );
}

export function ErpQuotesScreen() {
  return (
    <GenericListScreen<ErpQuote>
      title="Devis"
      subtitle="Propositions commerciales"
      fetcher={() => erpApi.listQuotes()}
      emptyTitle="Aucun devis"
      emptySubtitle="Aucun devis n’a encore été généré."
      getKey={(item) => item._id}
      renderItem={(quote) => (
        <Pressable style={({ pressed }) => [styles.cardItem, pressed && styles.cardPressed]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{quote.quoteNumber || 'Devis'}</Text>
            <Badge color={quote.status === 'approved' ? 'green' : quote.status === 'sent' ? 'amber' : 'gray'}>{quote.status || 'draft'}</Badge>
          </View>
          <Text style={styles.cardMeta}>{quote.customerName || 'Client non renseigné'}</Text>
          <Text style={styles.cardMeta}>{money(quote.grandTotal)} · {dateLabel(quote.date)}</Text>
        </Pressable>
      )}
    />
  );
}

export function ErpSalesScreen() {
  return (
    <GenericListScreen<ErpSalesOrder>
      title="Ventes"
      subtitle="Commandes clients"
      fetcher={() => erpApi.listSalesOrders()}
      emptyTitle="Aucune vente"
      emptySubtitle="Aucune commande client n’a encore été créée."
      getKey={(item) => item._id}
      renderItem={(sale) => (
        <Pressable style={({ pressed }) => [styles.cardItem, pressed && styles.cardPressed]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{sale.orderNumber || 'Commande'}</Text>
            <Badge color={sale.status === 'delivered' ? 'green' : sale.status === 'cancelled' ? 'red' : 'blue'}>{sale.status || 'draft'}</Badge>
          </View>
          <Text style={styles.cardMeta}>{sale.customerName || 'Client non renseigné'}</Text>
          <Text style={styles.cardMeta}>{money(sale.grandTotal)} · {dateLabel(sale.date)}</Text>
        </Pressable>
      )}
    />
  );
}

export function ErpPurchasesScreen() {
  return (
    <GenericListScreen<ErpPurchaseOrder>
      title="Achats"
      subtitle="Commandes fournisseurs"
      fetcher={() => erpApi.listPurchaseOrders()}
      emptyTitle="Aucune commande d’achat"
      emptySubtitle="Aucune commande fournisseur n’a été créée."
      getKey={(item) => item._id}
      renderItem={(purchase) => (
        <Pressable style={({ pressed }) => [styles.cardItem, pressed && styles.cardPressed]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{purchase.orderNumber || 'Achat'}</Text>
            <Badge color={purchase.status === 'received' ? 'green' : purchase.status === 'cancelled' ? 'red' : 'amber'}>{purchase.status || 'draft'}</Badge>
          </View>
          <Text style={styles.cardMeta}>{purchase.supplierName || 'Fournisseur non renseigné'}</Text>
          <Text style={styles.cardMeta}>{money(purchase.grandTotal)} · {dateLabel(purchase.date)}</Text>
        </Pressable>
      )}
    />
  );
}

export function ErpStockScreen() {
  return (
    <GenericListScreen<ErpStockMovement>
      title="Stock"
      subtitle="Mouvements de stock"
      fetcher={() => erpApi.listStockMovements()}
      emptyTitle="Aucun mouvement"
      emptySubtitle="Le stock n’a pas encore de mouvements enregistrés."
      getKey={(item) => item._id}
      renderItem={(movement) => (
        <Pressable style={({ pressed }) => [styles.cardItem, pressed && styles.cardPressed]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{movement.productName || 'Produit'}</Text>
            <Badge color={movement.type === 'out' ? 'red' : movement.type === 'in' ? 'green' : 'blue'}>{movement.type}</Badge>
          </View>
          <Text style={styles.cardMeta}>Quantité : {movement.qty}</Text>
          <Text style={styles.cardMeta}>{dateLabel(movement.createdAt)}</Text>
        </Pressable>
      )}
    />
  );
}

export function ErpAccountingScreen() {
  return (
    <GenericListScreen<ErpAccount>
      title="Comptabilité"
      subtitle="Plan comptable"
      fetcher={() => erpApi.listAccounts()}
      emptyTitle="Aucun compte"
      emptySubtitle="Le plan comptable est vide."
      getKey={(item) => item._id}
      renderItem={(account) => (
        <Pressable style={({ pressed }) => [styles.cardItem, pressed && styles.cardPressed]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{account.name}</Text>
            <Badge color="gray">{account.type}</Badge>
          </View>
          <Text style={styles.cardMeta}>Compte : {account.accountNumber}</Text>
          <Text style={styles.cardMeta}>Solde : {money(account.balance)}</Text>
        </Pressable>
      )}
    />
  );
}

export function ErpHrScreen() {
  return (
    <GenericListScreen<ErpEmployee>
      title="RH"
      subtitle="Équipe et personnel"
      fetcher={() => erpApi.listEmployees()}
      emptyTitle="Aucun employé"
      emptySubtitle="Aucune personne n’a encore été ajoutée."
      getKey={(item) => item._id}
      renderItem={(employee) => (
        <Pressable style={({ pressed }) => [styles.cardItem, pressed && styles.cardPressed]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{employee.firstName} {employee.lastName}</Text>
            <Badge color={employee.status === 'active' ? 'green' : 'gray'}>{employee.status || 'active'}</Badge>
          </View>
          <Text style={styles.cardMeta}>{employee.department || '—'}</Text>
          <Text style={styles.cardMeta}>{employee.email || 'Email non renseigné'}</Text>
        </Pressable>
      )}
    />
  );
}

export function ErpSettingsScreen() {
  return (
    <GenericListScreen<ErpSetting>
      title="Paramètres"
      subtitle="Configuration du système"
      fetcher={() => erpApi.listSettings()}
      emptyTitle="Aucun paramètre"
      emptySubtitle="La configuration n’a pas encore de valeurs."
      getKey={(item) => `${item.category}-${item.key}`}
      renderItem={(setting) => (
        <Pressable style={({ pressed }) => [styles.cardItem, pressed && styles.cardPressed]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{setting.key}</Text>
            <Badge color="gray">{setting.category}</Badge>
          </View>
          <Text style={styles.cardMeta}>{typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[3] },
  error: { color: colors.dangerDeep, fontSize: fontSize.sm },
  statGrid: { gap: spacing[3] },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.foreground, marginBottom: spacing[3] },
  summaryList: { gap: spacing[2] },
  summaryText: { fontSize: fontSize.base, color: colors.muted },
  cardItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardPressed: { backgroundColor: colors.sunken },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[2] },
  cardTitle: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.foreground },
  cardMeta: { fontSize: fontSize.sm, color: colors.muted },
});
