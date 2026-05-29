import React from "react";
import { View } from "react-native";
import { BACKGROUND_COLORS } from "@/utils/backgroundColors";

const BgColorSwatch: React.FC<{ imagePath: string; style: object }> = ({ imagePath, style }) => {
  const colors = BACKGROUND_COLORS[imagePath];
  if (!colors) return null;
  return (
    <View style={[style, { overflow: "hidden", borderRadius: 8 }]}>
      <View style={{ flex: 0.72, backgroundColor: colors.wall }} />
      <View style={{ flex: 0.28, backgroundColor: colors.floor }} />
    </View>
  );
};

export default BgColorSwatch;
