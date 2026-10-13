import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface CurtainTransitionProps {
  visible: boolean;
  onComplete?: () => void;
}

export function CurtainTransition({
  visible,
  onComplete,
}: CurtainTransitionProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withDelay(
        100,
        withTiming(1, { duration: 600 }, () => {
          onComplete?.();
        }),
      );
    } else {
      progress.value = withTiming(0, { duration: 400 });
    }
  }, [visible, onComplete]);

  const leftCurtain = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-width / 2, 0]) },
    ],
  }));

  const rightCurtain = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [width / 2, 0]) },
    ],
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.curtain,
          styles.leftCurtain,
          leftCurtain,
        ]}
      />
      <Animated.View
        style={[
          styles.curtain,
          styles.rightCurtain,
          rightCurtain,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  curtain: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
  },
  leftCurtain: {
    left: 0,
    backgroundColor: "#09090b",
  },
  rightCurtain: {
    right: 0,
    backgroundColor: "#18181b",
  },
});
