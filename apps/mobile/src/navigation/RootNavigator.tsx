import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { LoadingScreen } from '../components/ui';
import LoginScreen from '../screens/LoginScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import DossierDetailScreen from '../screens/DossierDetailScreen';
import DossierFormScreen from '../screens/DossierFormScreen';
import InstallationCreateScreen from '../screens/InstallationCreateScreen';
import InstallationDetailScreen from '../screens/InstallationDetailScreen';
import {
  ErpDashboardScreen,
  ErpCustomersScreen,
  ErpProductsScreen,
  ErpQuotesScreen,
  ErpSalesScreen,
  ErpPurchasesScreen,
  ErpStockScreen,
  ErpAccountingScreen,
  ErpHrScreen,
  ErpSettingsScreen,
} from '../screens/ErpScreens';
import ErpCreateScreen from '../screens/ErpCreateScreen';
import AppTabs from './AppTabs';
import AdminScreen from '../screens/AdminScreen';
import ComingSoon from '../screens/ComingSoon';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  ResetPassword: { token?: string } | undefined;
  // Authenticated shell
  Main: undefined;
  // Dossiers (Phase 3)
  DossierDetail: { id: string };
  DossierCreate: undefined;
  DossierEdit: { id: string };
  // ERP modules (Phase 4)
  ErpDashboard: undefined;
  ErpCustomers: undefined;
  ErpCustomerCreate: { type?: 'customer'; id?: string } | undefined;
  ErpCustomerEdit: { id: string };
  ErpProducts: undefined;
  ErpProductCreate: { type?: 'product'; id?: string } | undefined;
  ErpProductEdit: { id: string };
  ErpQuotes: undefined;
  ErpSales: undefined;
  ErpPurchases: undefined;
  ErpStock: undefined;
  ErpAccounting: undefined;
  ErpHr: undefined;
  ErpSettings: undefined;
  // Installations (Phase 5)
  InstallationCreate: undefined;
  InstallationDetail: { id: string };
  // Admin (Phase 6)
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.foreground,
    border: colors.border,
  },
};

/** Wraps the ComingSoon placeholder with a fixed title (used for not-yet-built screens). */
function placeholder(title: string) {
  return function Placeholder() {
    return <ComingSoon title={title} />;
  };
}

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.foreground,
  headerTitleStyle: { fontWeight: '700' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

export default function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingScreen label="Chargement de votre session..." />
      </View>
    );
  }

  const authenticated = status === 'authenticated';

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={stackScreenOptions}>
        {authenticated ? (
          <>
            <Stack.Screen name="Main" component={AppTabs} options={{ headerShown: false }} />
            {/* Dossiers — Phase 3 */}
            <Stack.Screen name="DossierDetail" component={DossierDetailScreen} options={{ title: 'Dossier' }} />
            <Stack.Screen name="DossierCreate" component={DossierFormScreen} options={{ title: 'Nouveau dossier' }} />
            <Stack.Screen name="DossierEdit" component={DossierFormScreen} options={{ title: 'Modifier dossier' }} />
            {/* ERP — Phase 4 */}
            <Stack.Screen name="ErpDashboard" component={ErpDashboardScreen} options={{ title: 'Aperçu ERP' }} />
            <Stack.Screen name="ErpCustomers" component={ErpCustomersScreen} options={{ title: 'CRM' }} />
            <Stack.Screen name="ErpCustomerCreate" component={ErpCreateScreen} initialParams={{ type: 'customer' }} options={{ title: 'Nouveau client' }} />
            <Stack.Screen name="ErpCustomerEdit" component={ErpCreateScreen} options={{ title: 'Modifier client' }} />
            <Stack.Screen name="ErpProducts" component={ErpProductsScreen} options={{ title: 'Produits' }} />
            <Stack.Screen name="ErpProductCreate" component={ErpCreateScreen} initialParams={{ type: 'product' }} options={{ title: 'Nouveau produit' }} />
            <Stack.Screen name="ErpProductEdit" component={ErpCreateScreen} options={{ title: 'Modifier produit' }} />
            <Stack.Screen name="ErpQuotes" component={ErpQuotesScreen} options={{ title: 'Devis' }} />
            <Stack.Screen name="ErpSales" component={ErpSalesScreen} options={{ title: 'Ventes' }} />
            <Stack.Screen name="ErpPurchases" component={ErpPurchasesScreen} options={{ title: 'Achats' }} />
            <Stack.Screen name="ErpStock" component={ErpStockScreen} options={{ title: 'Stock' }} />
            <Stack.Screen name="ErpAccounting" component={ErpAccountingScreen} options={{ title: 'Comptabilité' }} />
            <Stack.Screen name="ErpHr" component={ErpHrScreen} options={{ title: 'RH' }} />
            <Stack.Screen name="ErpSettings" component={ErpSettingsScreen} options={{ title: 'Paramètres' }} />
            {/* Installations — Phase 5 */}
            <Stack.Screen name="InstallationCreate" component={InstallationCreateScreen} options={{ title: 'Nouveau chantier' }} />
            <Stack.Screen name="InstallationDetail" component={InstallationDetailScreen} options={{ title: 'Détail installation' }} />
            {/* Admin — Phase 6 */}
            <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Administration' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ title: 'Réinitialiser le mot de passe' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
