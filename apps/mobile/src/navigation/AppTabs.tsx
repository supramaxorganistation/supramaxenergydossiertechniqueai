import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';
import { Icon } from '../components/Icon';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ErpHubScreen from '../screens/ErpHubScreen';
import DossiersScreen from '../screens/DossiersScreen';
import InstallationsScreen from '../screens/InstallationsScreen';
import ComingSoon from '../screens/ComingSoon';

export type TabParamList = {
  Dashboard: undefined;
  Dossiers: undefined;
  Erp: undefined;
  Installations: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={tabOpt('Accueil', 'dashboard')} />
      <Tab.Screen name="Dossiers" component={DossiersScreen} options={tabOpt('Dossiers', 'folder')} />
      <Tab.Screen name="Erp" component={ErpHubScreen} options={tabOpt('ERP', 'building')} />
      <Tab.Screen name="Installations" component={InstallationsScreen} options={tabOpt('Chantiers', 'sun')} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={tabOpt('Profil', 'user')} />
    </Tab.Navigator>
  );
}

function tabOpt(label: string, icon: string) {
  return {
    title: label,
    tabBarLabel: label,
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <Icon name={icon} size={size} color={color} />,
  };
}

