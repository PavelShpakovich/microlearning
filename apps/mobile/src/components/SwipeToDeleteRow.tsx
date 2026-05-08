import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, type SwipeableRef } from '@/lib/gesture-handler';
import { useColors } from '@/lib/colors';
import { useTranslations } from '@/lib/i18n';

let openSwipeable: SwipeableRef | null = null;

type SwipeToDeleteRowProps = {
  children: React.ReactNode;
  onDeletePress: () => void | Promise<void>;
  disabled?: boolean;
  borderRadius?: number;
  testID?: string;
};

export function SwipeToDeleteRow({
  children,
  onDeletePress,
  disabled = false,
  borderRadius = 12,
  testID,
}: SwipeToDeleteRowProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors, borderRadius), [colors, borderRadius]);
  const swipeableRef = useRef<SwipeableRef | null>(null);
  const tCommon = useTranslations('common');

  useEffect(() => {
    return () => {
      if (openSwipeable === swipeableRef.current) {
        openSwipeable = null;
      }
    };
  }, []);

  function handleSwipeableWillOpen() {
    if (openSwipeable && openSwipeable !== swipeableRef.current) {
      openSwipeable.close();
    }
    openSwipeable = swipeableRef.current;
  }

  function handleSwipeableClose() {
    if (openSwipeable === swipeableRef.current) {
      openSwipeable = null;
    }
  }

  async function handleDelete(swipeable: SwipeableRef) {
    swipeable.close();
    if (openSwipeable === swipeable) {
      openSwipeable = null;
    }
    await onDeletePress();
  }

  return (
    <Swipeable
      ref={swipeableRef}
      enabled={!disabled}
      friction={1.6}
      rightThreshold={40}
      dragOffsetFromRightEdge={24}
      overshootRight={false}
      overshootLeft={false}
      useNativeAnimations
      containerStyle={styles.container}
      childrenContainerStyle={styles.childrenContainer}
      onSwipeableWillOpen={handleSwipeableWillOpen}
      onSwipeableClose={handleSwipeableClose}
      renderRightActions={(_progress: unknown, _drag: unknown, methods: SwipeableRef) => (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            testID={testID}
            style={styles.deleteAction}
            activeOpacity={0.8}
            onPress={() => void handleDelete(methods)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructiveForeground} />
            <Text style={styles.deleteText}>{tCommon('delete')}</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      {children}
    </Swipeable>
  );
}

function createStyles(colors: ReturnType<typeof useColors>, borderRadius: number) {
  return StyleSheet.create({
    container: {
      borderRadius,
      overflow: 'hidden',
    },
    childrenContainer: {
      backgroundColor: colors.background,
    },
    actionsContainer: {
      width: 104,
      paddingLeft: 8,
      paddingVertical: 1,
      alignItems: 'stretch',
    },
    deleteAction: {
      flex: 1,
      backgroundColor: colors.destructive,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderTopLeftRadius: borderRadius,
      borderBottomLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      borderBottomRightRadius: borderRadius,
    },
    deleteText: {
      color: colors.destructiveForeground,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: 8,
    },
  });
}
