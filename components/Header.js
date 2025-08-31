import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const Header = ({onMenuPress}) => {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Create your best gallery today</Text>
        </View>
        <TouchableOpacity style={styles.iconWrapper} onPress={onMenuPress}>
          <Icon name="menu-outline" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6A77FF',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 70,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Pushes menu to the right
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#fff',
    opacity: 0.8,
    fontSize: 16,
    marginTop: 4,
  },
  iconWrapper: {
    paddingRight: 3,
    paddingBottom: 20,
    borderRadius: 16,
  },
});

export default Header;
