// @ts-nocheck
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 18,
    marginBottom: 16,
  },
  row: {
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    color: '#4A5568',
  },
});

export default function ReceiptPDF({
  receiptNumber,
  recipient,
  amount,
  reference,
}: {
  receiptNumber: string;
  recipient: string;
  amount: string;
  reference: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Affilia Official Receipt</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Receipt Number</Text>
          <Text>{receiptNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Recipient</Text>
          <Text>{recipient}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount</Text>
          <Text>{amount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>M-Pesa Reference</Text>
          <Text>{reference}</Text>
        </View>
        <Text style={{ marginTop: 24 }}>Bridge. Earn. Grow.</Text>
      </Page>
    </Document>
  );
}
