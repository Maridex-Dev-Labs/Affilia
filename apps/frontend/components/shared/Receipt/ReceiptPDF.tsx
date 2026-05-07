// @ts-nocheck
import { Document, Page, StyleSheet, Svg, Path, Rect, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 32,
    paddingHorizontal: 36,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#f7f1e6',
    color: '#132033',
  },
  topBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    flexDirection: 'row',
  },
  topBlack: { flex: 3, backgroundColor: '#0b1018' },
  topRed: { flex: 2, backgroundColor: '#9b1c1c' },
  topWhite: { flex: 1, backgroundColor: '#ffffff' },
  topGreen: { flex: 4, backgroundColor: '#0f8a43' },
  watermarkWrap: {
    position: 'absolute',
    top: 180,
    left: 85,
    width: 420,
    height: 420,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.08,
    transform: 'rotate(-18deg)',
  },
  watermarkLogoWrap: {
    marginBottom: 12,
  },
  watermarkText: {
    fontSize: 54,
    fontWeight: 800,
    letterSpacing: 4,
    color: '#132033',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#d6d0c3',
    paddingBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoWrap: {
    width: 34,
    height: 34,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2.1,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#586274',
    lineHeight: 1.5,
    maxWidth: 310,
  },
  badge: {
    borderWidth: 1,
    borderColor: '#ced6c7',
    backgroundColor: '#eef7f0',
    color: '#0f8a43',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#dfd8ca',
    borderRadius: 12,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 800,
    color: '#101522',
  },
  summaryHint: {
    fontSize: 9,
    color: '#667085',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#dfd8ca',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#0f8a43',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe4d8',
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowLabel: {
    fontSize: 10,
    color: '#5f6878',
  },
  rowValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#101522',
    textAlign: 'right',
    maxWidth: 280,
  },
  verificationBox: {
    marginTop: 10,
    backgroundColor: '#121824',
    borderRadius: 12,
    padding: 14,
  },
  verificationLabel: {
    fontSize: 9,
    color: '#97a2b6',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  verificationValue: {
    fontSize: 10,
    color: '#ffffff',
    lineHeight: 1.55,
  },
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#d6d0c3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
  },
});


function AffiliaMark({ size = 34, opacity = 1 }: { size?: number; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={{ opacity }}>
      <Rect x={6} y={6} width={52} height={52} rx={10} fill="#0b1018" />
      <Rect x={14} y={18} width={36} height={8} rx={3} fill="#bb1e1e" />
      <Rect x={14} y={38} width={36} height={8} rx={3} fill="#0f8a43" />
      <Path d="M16 47 L29 17 L37 17 L24 47 Z" fill="#ffffff" />
      <Path d="M31 47 L39 28 L48 47 L40 47 L35.5 36 L31 47 Z" fill="#ffffff" />
    </Svg>
  );
}

function formatType(value) {
  return String(value || 'receipt').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ReceiptPDF({
  receiptNumber,
  recipient,
  amount,
  reference,
  receiptType,
  generatedAt,
  verificationHash,
}: {
  receiptNumber: string;
  recipient: string;
  amount: string;
  reference: string;
  receiptType?: string;
  generatedAt?: string;
  verificationHash?: string;
}) {
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
          <View style={styles.watermarkLogoWrap}><AffiliaMark size={210} opacity={0.85} /></View>
          <Text style={styles.watermarkText}>AFFILIA</Text>
        </View>

        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.logoWrap}><AffiliaMark size={34} /></View>
              <Text style={styles.eyebrow}>Affilia Finance Desk</Text>
            </View>
            <Text style={styles.title}>Official Receipt</Text>
            <Text style={styles.subtitle}>
              This document confirms a verified Affilia money movement and can be used for audit, payout, deposit, and platform compliance records.
            </Text>
          </View>
          <Text style={styles.badge}>{formatType(receiptType)}</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Receipt Number</Text>
            <Text style={styles.summaryValue}>{receiptNumber}</Text>
            <Text style={styles.summaryHint}>Generated by the Affilia receipts engine.</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>{amount}</Text>
            <Text style={styles.summaryHint}>Captured in Kenyan shillings.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Details</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Recipient</Text>
            <Text style={styles.rowValue}>{recipient || 'Affilia user'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Receipt Type</Text>
            <Text style={styles.rowValue}>{formatType(receiptType)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>M-Pesa / Reference</Text>
            <Text style={styles.rowValue}>{reference || '—'}</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Issued At</Text>
            <Text style={styles.rowValue}>{generatedAt || '—'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification</Text>
          <Text style={styles.rowLabel}>Use the verification hash and receipt number to confirm authenticity through Affilia records.</Text>
          <View style={styles.verificationBox}>
            <Text style={styles.verificationLabel}>Verification Hash</Text>
            <Text style={styles.verificationValue}>{verificationHash || 'Pending issuance hash'}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Bridge. Earn. Grow.</Text>
          <Text style={styles.footerText}>affilia-support@gmail.com · +254742972001</Text>
        </View>
      </Page>
    </Document>
  );
}
