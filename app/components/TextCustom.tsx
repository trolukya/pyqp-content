import { View, Text, TextProps, StyleProp, TextStyle } from 'react-native'
import React from 'react'

interface TextCustomProps extends TextProps {
  style?: StyleProp<TextStyle>;
  fontSize?: number;
  children: React.ReactNode;
}

const TextCustom: React.FC<TextCustomProps> = ({style, fontSize=16, children, ...props}) => {
  return (
      <Text style={{...style as object, fontSize}} {...props}>{children}</Text>
  )
}

export default TextCustom