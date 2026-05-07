// @ts-nocheck
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import { contractMeta, type AgreementType } from '@/lib/legal/contracts';

const styles = StyleSheet.create({
  page: { paddingTop: 38, paddingBottom: 34, paddingHorizontal: 38, fontSize: 11, color: '#101522', backgroundColor: '#f7f1e6' },
  topBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 10, flexDirection: 'row' },
  topBlack: { flex: 3, backgroundColor: '#0b1018' },
  topRed: { flex: 2, backgroundColor: '#9b1c1c' },
  topWhite: { flex: 1, backgroundColor: '#ffffff' },
  topGreen: { flex: 4, backgroundColor: '#0f8a43' },
  watermarkWrap: { position: 'absolute', top: 240, left: 95, width: 390, height: 300, alignItems: 'center', justifyContent: 'center', opacity: 0.07, transform: 'rotate(-16deg)' },
  watermarkLogo: { width: 180, height: 180, marginBottom: 10 },
  watermarkText: { fontSize: 44, fontWeight: 800, letterSpacing: 3, color: '#132033' },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#d7d0c3', paddingBottom: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  logo: { width: 30, height: 30 },
  eyebrow: { fontSize: 10, color: '#8d1b1b', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' },
  title: { fontSize: 23, fontWeight: 800, marginBottom: 6 },
  subtitle: { fontSize: 10, color: '#5e6879', lineHeight: 1.5 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 800, marginBottom: 9, color: '#0f8a43', textTransform: 'uppercase', letterSpacing: 1.2 },
  card: { borderWidth: 1, borderColor: '#ddd6c9', borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: '#fffdf8' },
  itemTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  body: { fontSize: 10, lineHeight: 1.6, color: '#313b4c' },
  footer: { position: 'absolute', left: 38, right: 38, bottom: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#d7d0c3', flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#707887' },
});

export function ContractPdfDocument({ agreementType }: { agreementType: AgreementType }) {
  const meta = contractMeta[agreementType];
  const title = agreementType === 'merchant' ? 'Affilia Merchant Agreement' : 'Affilia Affiliate Agreement';
  const logoSrc = '/images/logo/affilia-mark.png';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBand} fixed>
          <View style={styles.topBlack} />
          <View style={styles.topRed} />
          <View style={styles.topWhite} />
          <View style={styles.topGreen} />
        </View>

        <View style={styles.watermarkWrap} fixed>
          <Image src={logoSrc} style={styles.watermarkLogo} />
          <Text style={styles.watermarkText}>AFFILIA</Text>
        </View>

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image src={logoSrc} style={styles.logo} />
            <Text style={styles.eyebrow}>Affilia Legal Agreement</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{meta.blurb}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Summary</Text>
          {meta.summary.map((item) => (
            <View key={item} style={styles.card}>
              <Text style={styles.body}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core Clauses</Text>
          {meta.clauses.map((clause) => (
            <View key={clause.heading} style={styles.card}>
              <Text style={styles.itemTitle}>{clause.heading}</Text>
              <Text style={styles.body}>{clause.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Acknowledgements</Text>
          {meta.acknowledgements.map((item) => (
            <View key={item.key} style={styles.card}>
              <Text style={styles.body}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Bridge. Earn. Grow.</Text>
          <Text style={styles.footerText}>affilia-support@gmail.com · +254742972001</Text>
        </View>
      </Page>
    </Document>
  );
}
