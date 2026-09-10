import React from 'react';
import {Image, StyleSheet, Text, View, ViewStyle} from 'react-native';

import Colors from '../../theme/colors';

export type AppIconName =
  | 'om'
  | 'mala'
  | 'trophy'
  | 'chart'
  | 'prayer'
  | 'flame'
  | 'bowl'
  | 'banalingam'
  | 'person'
  | 'bell'
  | 'box'
  | 'settings'
  | 'globe'
  | 'logout'
  | 'camera'
  | 'home'
  | 'japa'
  | 'seva'
  | 'orders'
  | 'profile'
  | 'care';

interface Props {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

/** Photo icons for hub / home tiles — fill circular containers. */
const PHOTO: Partial<Record<AppIconName, any>> = {
  mala: require('../../assets/images/family_japa.webp'),
  trophy: require('../../assets/images/achievements.webp'),
  chart: require('../../assets/images/myprogress.webp'),
  banalingam: require('../../assets/images/banalingam.webp'),
  bowl: require('../../assets/images/donation.webp'),
  flame: require('../../assets/images/festivals.webp'),
  prayer: require('../../assets/images/chant.webp'),
  box: require('../../assets/images/order.webp'),
  care: require('../../assets/images/customer_care.webp'),
  // person/profile/seva/japa/orders intentionally omitted — line icons for tabs
};

const AppIcon: React.FC<Props> = ({
  name,
  size = 22,
  color = Colors.sacredBrown,
  style,
}) => {
  const photo = PHOTO[name];
  if (photo) {
    return (
      <Image
        source={photo}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[{width: size, height: size}, style]}>
      {renderLineIcon(name, size, color)}
    </View>
  );
};

function renderLineIcon(name: AppIconName, size: number, color: string) {
  const stroke = Math.max(1.5, size * 0.08);

  switch (name) {
    case 'bell':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <View
            style={{
              width: size * 0.55,
              height: size * 0.42,
              borderWidth: stroke,
              borderColor: color,
              borderTopLeftRadius: size * 0.28,
              borderTopRightRadius: size * 0.28,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
            }}
          />
          <View
            style={{
              width: size * 0.7,
              height: stroke,
              backgroundColor: color,
              marginTop: 2,
              borderRadius: 1,
            }}
          />
          <View
            style={{
              width: size * 0.14,
              height: size * 0.14,
              borderRadius: size * 0.07,
              backgroundColor: color,
              marginTop: 2,
            }}
          />
        </View>
      );
    case 'settings':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          {[0.55, 0.78, 0.42].map((widthRatio, index) => (
            <View
              key={`settings-line-${index}`}
              style={{
                width: size * widthRatio,
                height: stroke,
                backgroundColor: color,
                borderRadius: 1,
                marginVertical: size * 0.07,
              }}
            />
          ))}
        </View>
      );
    case 'prayer':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <View
            style={{
              width: size * 0.72,
              height: size * 0.52,
              borderRadius: size * 0.14,
              borderWidth: stroke,
              borderColor: color,
              paddingHorizontal: size * 0.1,
              paddingTop: size * 0.12,
            }}>
            <View
              style={{
                width: '100%',
                height: stroke,
                backgroundColor: color,
                borderRadius: 1,
                marginBottom: size * 0.08,
              }}
            />
            <View
              style={{
                width: '68%',
                height: stroke,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
          <View
            style={{
              width: 0,
              height: 0,
              marginTop: -1,
              marginRight: size * 0.22,
              borderLeftWidth: size * 0.1,
              borderRightWidth: size * 0.1,
              borderTopWidth: size * 0.12,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
              alignSelf: 'flex-end',
            }}
          />
        </View>
      );
    case 'globe':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <View
            style={{
              width: size * 0.78,
              height: size * 0.78,
              borderRadius: size * 0.39,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                position: 'absolute',
                width: size * 0.38,
                height: size * 0.78,
                borderWidth: stroke,
                borderColor: color,
                borderRadius: size * 0.19,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.78,
                height: stroke,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
    case 'logout':
      return (
        <View
          style={[
            styles.center,
            {width: size, height: size, flexDirection: 'row'},
          ]}>
          <View
            style={{
              width: size * 0.42,
              height: size * 0.7,
              borderWidth: stroke,
              borderColor: color,
              borderTopLeftRadius: 4,
              borderBottomLeftRadius: 4,
              borderRightWidth: 0,
            }}
          />
          <View style={{marginLeft: 3, alignItems: 'center'}}>
            <View
              style={{
                width: size * 0.28,
                height: stroke,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                width: 0,
                height: 0,
                marginTop: -stroke,
                marginLeft: size * 0.2,
                borderTopWidth: size * 0.12,
                borderBottomWidth: size * 0.12,
                borderLeftWidth: size * 0.16,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: color,
              }}
            />
          </View>
        </View>
      );
    case 'camera':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <View
            style={{
              width: size * 0.82,
              height: size * 0.58,
              borderRadius: 4,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                width: size * 0.28,
                height: size * 0.28,
                borderRadius: size * 0.14,
                borderWidth: stroke,
                borderColor: color,
              }}
            />
          </View>
        </View>
      );
    case 'home':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size * 0.36,
              borderRightWidth: size * 0.36,
              borderBottomWidth: size * 0.3,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          <View
            style={{
              width: size * 0.55,
              height: size * 0.38,
              borderWidth: stroke,
              borderColor: color,
              borderTopWidth: 0,
              marginTop: -1,
            }}
          />
        </View>
      );
    case 'japa':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <View
            style={{
              width: size * 0.72,
              height: size * 0.72,
              borderRadius: size * 0.36,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                width: size * 0.18,
                height: size * 0.18,
                borderRadius: size * 0.09,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
    case 'seva':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <View
            style={{
              width: size * 0.42,
              height: size * 0.38,
              borderTopLeftRadius: size * 0.22,
              borderTopRightRadius: size * 0.22,
              borderBottomLeftRadius: size * 0.05,
              borderBottomRightRadius: size * 0.05,
              borderWidth: stroke,
              borderColor: color,
              transform: [{rotate: '-28deg'}, {translateX: -size * 0.08}],
              position: 'absolute',
            }}
          />
          <View
            style={{
              width: size * 0.42,
              height: size * 0.38,
              borderTopLeftRadius: size * 0.22,
              borderTopRightRadius: size * 0.22,
              borderBottomLeftRadius: size * 0.05,
              borderBottomRightRadius: size * 0.05,
              borderWidth: stroke,
              borderColor: color,
              transform: [{rotate: '28deg'}, {translateX: size * 0.08}],
              position: 'absolute',
            }}
          />
        </View>
      );
    case 'om':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <Text
            style={{
              fontSize: size * 0.62,
              lineHeight: size * 0.72,
              color,
              fontWeight: '700',
              textAlign: 'center',
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}>
            ॐ
          </Text>
        </View>
      );
    case 'orders':
    case 'box':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <View
            style={{
              width: size * 0.62,
              height: size * 0.52,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 3,
              marginTop: size * 0.12,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: size * 0.12,
              width: size * 0.36,
              height: size * 0.16,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 2,
              backgroundColor: 'transparent',
            }}
          />
        </View>
      );
    case 'profile':
    case 'person':
      return (
        <View style={[styles.center, {width: size, height: size}]}>
          <View
            style={{
              width: size * 0.32,
              height: size * 0.32,
              borderRadius: size * 0.16,
              borderWidth: stroke,
              borderColor: color,
              marginBottom: 3,
            }}
          />
          <View
            style={{
              width: size * 0.58,
              height: size * 0.28,
              borderTopLeftRadius: size * 0.29,
              borderTopRightRadius: size * 0.29,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
            }}
          />
        </View>
      );
    default:
      return (
        <View
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      );
  }
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppIcon;
