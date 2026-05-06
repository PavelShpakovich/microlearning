import path from 'path';
import { Document, Font, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

// Register Noto Sans – supports Latin, Cyrillic, and most other scripts.
// Font files are bundled in public/fonts/ so no network request is needed at render time.
const fontsDir = path.join(process.cwd(), 'public', 'fonts');
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: path.join(fontsDir, 'NotoSans-Regular.ttf'), fontWeight: 'normal', fontStyle: 'normal' },
    { src: path.join(fontsDir, 'NotoSans-Bold.ttf'), fontWeight: 'bold', fontStyle: 'normal' },
    { src: path.join(fontsDir, 'NotoSans-Italic.ttf'), fontWeight: 'normal', fontStyle: 'italic' },
  ],
});

// Disable hyphenation for Russian text
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSans',
    fontSize: 11,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    backgroundColor: '#FFFFFF',
    color: '#1a1a2e',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  brandName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6d28d9',
    letterSpacing: 1,
  },
  typeLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#8b5cf6',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 1.2,
    color: '#111827',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 24,
  },
  summaryBox: {
    backgroundColor: '#f5f3ff',
    borderRadius: 6,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
  },
  summaryText: {
    fontSize: 11,
    lineHeight: 1.7,
    color: '#374151',
    fontStyle: 'italic',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionNumber: {
    width: 22,
    height: 22,
    backgroundColor: '#ede9fe',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  sectionContent: {
    fontSize: 11,
    lineHeight: 1.75,
    color: '#374151',
    paddingLeft: 30,
  },
  paragraph: {
    marginBottom: 8,
  },
  adviceContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
  },
  adviceHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#8b5cf6',
    marginBottom: 10,
  },
  adviceItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  adviceBullet: {
    width: 18,
    height: 18,
    backgroundColor: '#ede9fe',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  adviceBulletText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  adviceText: {
    fontSize: 10,
    lineHeight: 1.65,
    color: '#374151',
    flex: 1,
  },
  disclaimerText: {
    fontSize: 8,
    lineHeight: 1.5,
    color: '#9ca3af',
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#d1d5db',
  },
});

interface ReadingPdfProps {
  title: string;
  typeLabel: string;
  createdAt: string;
  summary?: string;
  sections?: Array<{ key: string; title: string; content: string }>;
  advice?: string[];
  disclaimers?: string[];
}

export function ReadingPdfDocument({
  title,
  typeLabel,
  createdAt,
  summary,
  sections,
  advice,
  disclaimers,
}: ReadingPdfProps) {
  return (
    <Document title={title} author="Clario Astrology">
      <Page size="A4" style={styles.page}>
        {/* Brand header */}
        <View style={styles.brandRow}>
          <Text style={styles.brandName}>CLARIO ASTROLOGY</Text>
        </View>

        {/* Reading header */}
        <Text style={styles.typeLabel}>{typeLabel}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.dateText}>{createdAt}</Text>

        {/* Summary */}
        {summary ? (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* Sections */}
        {(sections ?? []).map((section, idx) => (
          <View key={section.key} style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow} wrap={false}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionContent}>
              {section.content
                .split('\n\n')
                .filter(Boolean)
                .map((para, pIdx) => (
                  <Text key={pIdx} style={styles.paragraph}>
                    {para}
                  </Text>
                ))}
            </View>
          </View>
        ))}

        {/* Advice */}
        {advice && advice.length > 0 ? (
          <View style={styles.adviceContainer}>
            <Text style={styles.adviceHeader}>Ключевые рекомендации</Text>
            {advice.map((item, idx) => (
              <View key={idx} style={styles.adviceItem}>
                <View style={styles.adviceBullet}>
                  <Text style={styles.adviceBulletText}>{idx + 1}</Text>
                </View>
                <Text style={styles.adviceText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Disclaimers */}
        {disclaimers && disclaimers.length > 0 ? (
          <Text style={styles.disclaimerText}>{disclaimers.join(' ')}</Text>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>clario.app</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
