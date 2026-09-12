import React from 'react';
import {StyleSheet, Text, TextInput} from 'react-native';

const MIN_RATIO = 1.42;

const flatten = (style: any) => StyleSheet.flatten(style) || {};

const loosenStyle = (style: any, isInput = false) => {
  const flat = flatten(style);
  // Emoji / icon glyphs opt out with includeFontPadding: false
  if (flat.includeFontPadding === false) {
    return style;
  }

  const fontSize = Number(flat.fontSize) || (isInput ? 16 : 14);
  const extra: Record<string, any> = {
    includeFontPadding: true,
  };

  // Decorative oversized glyphs (chevrons) should not grow the row
  if (fontSize < 26) {
    const minLine = Math.ceil(fontSize * MIN_RATIO);
    if (!flat.lineHeight || Number(flat.lineHeight) < minLine) {
      extra.lineHeight = minLine;
    }
  }

  extra.paddingBottom = Math.max(Number(flat.paddingBottom) || 0, isInput ? 4 : 2);

  return style ? [style, extra] : extra;
};

let patched = false;

/** Stops Telugu / Hindi descenders from being clipped under the baseline. */
export const patchIndicSafeText = () => {
  if (patched) {
    return;
  }
  patched = true;

  const original = React.createElement.bind(React);
  (React as any).createElement = (type: any, props: any, ...children: any[]) => {
    if (
      props &&
      (type === Text || type === TextInput) &&
      !props.suppressIndicPad
    ) {
      props = {
        ...props,
        style: loosenStyle(props.style, type === TextInput),
      };
    }
    return original(type, props, ...children);
  };
};

patchIndicSafeText();
