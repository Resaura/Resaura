import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS, RADII, SHADOW } from '@/lib/theme';

export type TvaCalculatorMode = 'ht' | 'ttc';
export type TvaCalculatorResult = {
  mode: TvaCalculatorMode;
  rate: number;
  ht: number;
  tva: number;
  ttc: number;
};
type Operator = '+' | '-' | 'x' | '/';

type Props = {
  initialMode?: TvaCalculatorMode;
  initialAmount?: number;
  initialRate?: number;
  onApply?: (result: TvaCalculatorResult) => void;
  onClose?: () => void;
};

export const TVA_RATES = [5.5, 10, 20] as const;

export default function TvaCalculator({
  initialMode = 'ht',
  initialAmount = 0,
  initialRate = 20,
  onApply,
  onClose,
}: Props) {
  const [mode, setMode] = useState<TvaCalculatorMode>(initialMode);
  const [rate, setRate] = useState<number>(initialRate);
  const [rawValue, setRawValue] = useState<string>(formatInput(initialAmount));
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null);
  const [overwriteInput, setOverwriteInput] = useState<boolean>(false);

  const numericValue = useMemo(() => parseNumeric(rawValue), [rawValue]);
  const ht = mode === 'ht' ? numericValue : numericValue / (1 + rate / 100);
  const ttc = mode === 'ht' ? numericValue * (1 + rate / 100) : numericValue;
  const tva = ttc - ht;

  const resetComputation = (shouldOverwrite = false) => {
    setPendingValue(null);
    setPendingOperator(null);
    setOverwriteInput(shouldOverwrite);
  };

  const setEntryMode = (next: TvaCalculatorMode) => {
    if (next === mode) return;
    setMode(next);
    const target = next === 'ht' ? ht : ttc;
    setRawValue(formatInput(target));
    resetComputation(true);
  };

  const append = (digit: string) => {
    setRawValue((prev) => {
      const base = overwriteInput ? '0' : prev;
      if (digit === '.') {
        if (base.includes('.')) return base || '0';
        return base ? `${base}.` : '0.';
      }
      if (base === '0' || overwriteInput) {
        return digit;
      }
      return `${base}${digit}`;
    });
    setOverwriteInput(false);
  };

  const clear = () => {
    setRawValue('0');
    resetComputation();
  };
  const backspace = () => {
    setOverwriteInput(false);
    setRawValue((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };
  const applyPercent = () => {
    const computed = pendingValue !== null ? (pendingValue * numericValue) / 100 : numericValue / 100;
    setRawValue(formatInput(computed));
    setOverwriteInput(true);
  };
  const handleOperator = (operator: Operator) => {
    if (pendingOperator !== null && pendingValue !== null && !overwriteInput) {
      const result = performOperation(pendingValue, numericValue, pendingOperator);
      setPendingValue(result);
      setRawValue(formatInput(result));
    } else {
      setPendingValue(numericValue);
    }
    setPendingOperator(operator);
    setOverwriteInput(true);
  };
  const handleEquals = () => {
    if (pendingOperator === null || pendingValue === null) return;
    const result = performOperation(pendingValue, numericValue, pendingOperator);
    setRawValue(formatInput(result));
    resetComputation(true);
  };

  const handleApply = () => {
    if (!onApply) return;
    onApply({
      mode,
      rate,
      ht,
      tva,
      ttc,
    });
    onClose?.();
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Calculatrice TVA</Text>

      <View style={styles.blocks}>
        <TouchableOpacity
          style={[styles.amountBlock, mode === 'ht' && styles.amountBlockActive]}
          onPress={() => setEntryMode('ht')}
        >
          <Text style={styles.amountLabel}>HT</Text>
          <View style={styles.amountValueRow}>
            <Text style={styles.amountValue}>{formatCurrency(ht)}</Text>
            {mode === 'ht' && pendingOperator && (
              <Text style={styles.pendingOperator}>{formatOperator(pendingOperator)}</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>TVA</Text>
          <Text style={styles.amountValue}>{formatCurrency(tva)}</Text>
        </View>

        <View style={styles.rateRow}>
          {TVA_RATES.map((option) => {
            const active = option === rate;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.rateOption, active && styles.rateOptionActive]}
                onPress={() => setRate(option)}
              >
                <Text style={[styles.rateOptionText, active && styles.rateOptionTextActive]}>
                  {option}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.amountBlock, mode === 'ttc' && styles.amountBlockActive]}
          onPress={() => setEntryMode('ttc')}
        >
          <Text style={styles.amountLabel}>TTC</Text>
          <View style={styles.amountValueRow}>
            <Text style={styles.amountValue}>{formatCurrency(ttc)}</Text>
            {mode === 'ttc' && pendingOperator && (
              <Text style={styles.pendingOperator}>{formatOperator(pendingOperator)}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.keypad}>
        {keypadRows.map((row, rowIndex) => (
          <View key={row.join('-') + rowIndex} style={styles.keypadRow}>
            {row.map((item, colIndex) => {
              if (item === 'SPACER') {
                return (
                  <View key={`spacer-${rowIndex}-${colIndex}`} style={styles.keypadSpacer} />
                );
              }
              return (
                <TouchableOpacity
                  key={item + rowIndex + colIndex}
                  style={[
                    styles.keypadBtn,
                    (item === 'DEL' || item === 'CA' || item === '=') && styles.keypadBtnAccent,
                  ]}
                  onPress={() => {
                    if (item === 'DEL') return backspace();
                    if (item === 'CA') return clear();
                    if (item === '%') return applyPercent();
                    if (isOperator(item)) return handleOperator(item);
                    if (item === '=') return handleEquals();
                    append(item);
                  }}
                >
                  <Text
                    style={[
                      styles.keypadText,
                      (item === 'DEL' || item === 'CA' || item === '=') && styles.keypadTextAccent,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        {onClose && (
          <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
            <Text style={styles.footerBtnText}>Fermer</Text>
          </TouchableOpacity>
        )}
        {onApply && (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnPrimary]} onPress={handleApply}>
            <Text style={[styles.footerBtnText, styles.footerBtnPrimaryText]}>Utiliser</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const keypadRows: string[][] = [
  ['DEL', 'CA', 'SPACER', '/'],
  ['7', '8', '9', 'x'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '%', '='],
];

const isOperator = (value: string): value is Operator =>
  value === '+' || value === '-' || value === 'x' || value === '/';

const formatInput = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  return Number(value).toString();
};

const parseNumeric = (value: string) => {
  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const performOperation = (a: number, b: number, operator: Operator) => {
  switch (operator) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case 'x':
      return a * b;
    case '/':
      return b === 0 ? 0 : a / b;
    default:
      return b;
  }
};

const formatOperator = (operator: Operator) => {
  switch (operator) {
    case 'x':
      return '×';
    case '/':
      return '÷';
    default:
      return operator;
  }
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    gap: 16,
  },
  header: { color: COLORS.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  blocks: { gap: 12 },
  amountBlock: {
    borderRadius: RADII.card,
    backgroundColor: COLORS.inputBg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  amountBlockActive: {
    borderColor: COLORS.azure,
    backgroundColor: 'rgba(13,231,244,0.15)',
  },
  amountLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  amountValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  amountValue: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  pendingOperator: { color: COLORS.textMuted, fontSize: 20, fontWeight: '800' },
  rateRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  rateOption: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADII.button,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  rateOptionActive: { backgroundColor: COLORS.azure, borderColor: COLORS.azure },
  rateOptionText: { color: COLORS.text, fontWeight: '700' },
  rateOptionTextActive: { color: COLORS.darkText },
  keypad: {
    backgroundColor: COLORS.backgroundDeep,
    borderRadius: RADII.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.backgroundDeep,
    ...SHADOW.card,
  },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  keypadBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADII.button,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  keypadSpacer: { flex: 1, minHeight: 48 },
  keypadBtnAccent: { backgroundColor: COLORS.azure, borderColor: COLORS.azure },
  keypadText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  keypadTextAccent: { color: COLORS.darkText },
  footer: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  footerBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  footerBtnPrimary: { backgroundColor: COLORS.azure, borderColor: COLORS.azure },
  footerBtnText: { color: COLORS.text, fontWeight: '700' },
  footerBtnPrimaryText: { color: COLORS.darkText },
});
