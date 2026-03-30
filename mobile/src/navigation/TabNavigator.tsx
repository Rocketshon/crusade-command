import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

// Screens
import ArmyBuilderScreen from '../screens/ArmyBuilderScreen';
import ModeSelectScreen from '../screens/ModeSelectScreen';
import ArmyCrusadeSetupScreen from '../screens/ArmyCrusadeSetupScreen';
import ArmyUnitDetailScreen from '../screens/ArmyUnitDetailScreen';
import PostBattleScreen from '../screens/PostBattleScreen';
import BattleHistoryScreen from '../screens/BattleHistoryScreen';
import PhaseNavigatorScreen from '../screens/PhaseNavigatorScreen';
import CodexHomeScreen from '../screens/CodexHomeScreen';
import FactionCodexScreen from '../screens/FactionCodexScreen';
import DatasheetViewScreen from '../screens/DatasheetViewScreen';
import SpaceMarinesChaptersScreen from '../screens/SpaceMarinesChaptersScreen';
import RulesBrowserScreen from '../screens/RulesBrowserScreen';
import RuleDetailScreen from '../screens/RuleDetailScreen';
import MyModelsScreen from '../screens/MyModelsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NewsScreen from '../screens/NewsScreen';
import DiceCalculatorScreen from '../screens/DiceCalculatorScreen';
import LoreQuizScreen from '../screens/LoreQuizScreen';

const Tab = createBottomTabNavigator();

// --- Army Stack ---
const ArmyStack = createNativeStackNavigator();
function ArmyStackScreen() {
  return (
    <ArmyStack.Navigator screenOptions={{ headerShown: false }}>
      <ArmyStack.Screen name="ArmyBuilder" component={ArmyBuilderScreen} />
      <ArmyStack.Screen name="ModeSelect" component={ModeSelectScreen} />
      <ArmyStack.Screen name="CrusadeSetup" component={ArmyCrusadeSetupScreen} />
      <ArmyStack.Screen name="UnitDetail" component={ArmyUnitDetailScreen} />
      <ArmyStack.Screen name="PostBattle" component={PostBattleScreen} />
      <ArmyStack.Screen name="BattleHistory" component={BattleHistoryScreen} />
    </ArmyStack.Navigator>
  );
}

// --- Battle Aid Stack ---
const BattleAidStack = createNativeStackNavigator();
function BattleAidStackScreen() {
  return (
    <BattleAidStack.Navigator screenOptions={{ headerShown: false }}>
      <BattleAidStack.Screen name="PhaseNavigator" component={PhaseNavigatorScreen} />
      <BattleAidStack.Screen name="DiceCalculator" component={DiceCalculatorScreen} />
      <BattleAidStack.Screen name="LoreQuiz" component={LoreQuizScreen} />
    </BattleAidStack.Navigator>
  );
}

// --- Codex Stack ---
const CodexStack = createNativeStackNavigator();
function CodexStackScreen() {
  return (
    <CodexStack.Navigator screenOptions={{ headerShown: false }}>
      <CodexStack.Screen name="CodexHome" component={CodexHomeScreen} />
      <CodexStack.Screen name="FactionCodex" component={FactionCodexScreen} />
      <CodexStack.Screen name="DatasheetView" component={DatasheetViewScreen} />
      <CodexStack.Screen name="SpaceMarinesChapters" component={SpaceMarinesChaptersScreen} />
      <CodexStack.Screen name="News" component={NewsScreen} />
    </CodexStack.Navigator>
  );
}

// --- Rules Stack ---
const RulesStack = createNativeStackNavigator();
function RulesStackScreen() {
  return (
    <RulesStack.Navigator screenOptions={{ headerShown: false }}>
      <RulesStack.Screen name="RulesBrowser" component={RulesBrowserScreen} />
      <RulesStack.Screen name="RuleDetail" component={RuleDetailScreen} />
    </RulesStack.Navigator>
  );
}

// --- My Models Stack ---
const ModelsStack = createNativeStackNavigator();
function ModelsStackScreen() {
  return (
    <ModelsStack.Navigator screenOptions={{ headerShown: false }}>
      <ModelsStack.Screen name="MyModels" component={MyModelsScreen} />
    </ModelsStack.Navigator>
  );
}

// --- Settings Stack ---
const SettingsStack = createNativeStackNavigator();
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
    </SettingsStack.Navigator>
  );
}

// --- Tab Icons ---
const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  ArmyTab: { focused: 'shield', default: 'shield-outline' },
  BattleAidTab: { focused: 'flash', default: 'flash-outline' },
  CodexTab: { focused: 'book', default: 'book-outline' },
  RulesTab: { focused: 'document-text', default: 'document-text-outline' },
  ModelsTab: { focused: 'cube', default: 'cube-outline' },
  SettingsTab: { focused: 'settings', default: 'settings-outline' },
};

export default function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size }) => {
          const iconSet = TAB_ICONS[route.name] ?? TAB_ICONS.ArmyTab;
          const iconName = focused ? iconSet.focused : iconSet.default;
          return <Ionicons name={iconName} size={size} color={focused ? colors.accentGold : colors.textSecondary} />;
        },
        tabBarActiveTintColor: colors.accentGold,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.bgPrimary,
          borderTopColor: colors.borderColor,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.5,
        },
      })}
    >
      <Tab.Screen name="ArmyTab" component={ArmyStackScreen} options={{ tabBarLabel: 'Army' }} />
      <Tab.Screen name="BattleAidTab" component={BattleAidStackScreen} options={{ tabBarLabel: 'Battle Aid' }} />
      <Tab.Screen name="CodexTab" component={CodexStackScreen} options={{ tabBarLabel: 'Codex' }} />
      <Tab.Screen name="RulesTab" component={RulesStackScreen} options={{ tabBarLabel: 'Rules' }} />
      <Tab.Screen name="ModelsTab" component={ModelsStackScreen} options={{ tabBarLabel: 'My Models' }} />
      <Tab.Screen name="SettingsTab" component={SettingsStackScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
