import path from 'path';
import type { ComponentType } from 'react';
import { Document, Font, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const PdfDocument = Document as unknown as ComponentType<any>;
const PdfPage = Page as unknown as ComponentType<any>;
const PdfView = View as unknown as ComponentType<any>;
const PdfText = Text as unknown as ComponentType<any>;

type PdfRenderContext = {
  pageNumber: number;
  totalPages: number;
};

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
    <PdfDocument title={title} author="Clario Astrology">
      <PdfPage size="A4" style={styles.page}>
        {/* Brand header */}
        <PdfView style={styles.brandRow}>
          <PdfText style={styles.brandName}>CLARIO ASTROLOGY</PdfText>
        </PdfView>

        {/* Reading header */}
        <PdfText style={styles.typeLabel}>{typeLabel}</PdfText>
        <PdfText style={styles.title}>{title}</PdfText>
        <PdfText style={styles.dateText}>{createdAt}</PdfText>

        {/* Summary */}
        {summary ? (
          <PdfView style={styles.summaryBox}>
            <PdfText style={styles.summaryText}>{summary}</PdfText>
          </PdfView>
        ) : null}

        {/* Sections */}
        {(sections ?? []).map((section, idx) => (
          <PdfView key={section.key} style={styles.sectionContainer}>
            <PdfView style={styles.sectionHeaderRow} wrap={false}>
              <PdfView style={styles.sectionNumber}>
                <PdfText style={styles.sectionNumberText}>{idx + 1}</PdfText>
              </PdfView>
              <PdfText style={styles.sectionTitle}>{section.title}</PdfText>
            </PdfView>
            <PdfView style={styles.sectionContent}>
              {section.content
                .split('\n\n')
                .filter(Boolean)
                .map((para, pIdx) => (
                  <PdfText key={pIdx} style={styles.paragraph}>
                    {para}
                  </PdfText>
                ))}
            </PdfView>
          </PdfView>
        ))}

        {/* Advice */}
        {advice && advice.length > 0 ? (
          <PdfView style={styles.adviceContainer}>
            <PdfText style={styles.adviceHeader}>Ключевые рекомендации</PdfText>
            {advice.map((item, idx) => (
              <PdfView key={idx} style={styles.adviceItem}>
                <PdfView style={styles.adviceBullet}>
                  <PdfText style={styles.adviceBulletText}>{idx + 1}</PdfText>
                </PdfView>
                <PdfText style={styles.adviceText}>{item}</PdfText>
              </PdfView>
            ))}
          </PdfView>
        ) : null}

        {/* Disclaimers */}
        {disclaimers && disclaimers.length > 0 ? (
          <PdfText style={styles.disclaimerText}>{disclaimers.join(' ')}</PdfText>
        ) : null}

        {/* Footer */}
        <PdfView style={styles.footer} fixed>
          <PdfText style={styles.footerText}>clario.app</PdfText>
          <PdfText
            style={styles.footerText}
            render={({ pageNumber, totalPages }: PdfRenderContext) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </PdfView>
      </PdfPage>
    </PdfDocument>
  );
}
