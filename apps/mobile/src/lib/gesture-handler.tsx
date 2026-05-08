import { createElement, forwardRef, type ElementRef, type PropsWithChildren } from 'react';
import { GestureHandlerRootView as BaseGestureHandlerRootView } from 'react-native-gesture-handler';
import BaseSwipeable from 'react-native-gesture-handler/Swipeable';
import type { StyleProp, ViewStyle } from 'react-native';
import type { SwipeableProps } from 'react-native-gesture-handler/lib/typescript/components/Swipeable';

export type SwipeableRef = InstanceType<typeof BaseSwipeable>;

type GestureHandlerRootViewProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export const GestureHandlerRootView = forwardRef<
  ElementRef<typeof BaseGestureHandlerRootView>,
  GestureHandlerRootViewProps
>(function GestureHandlerRootView(props, ref) {
  return createElement(BaseGestureHandlerRootView as never, { ...props, ref } as never);
});

export const Swipeable = forwardRef<SwipeableRef, SwipeableProps>(function Swipeable(props, ref) {
  return createElement(BaseSwipeable as never, { ...props, ref } as never);
});
