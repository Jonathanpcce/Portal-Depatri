export type DetectedIdentifier = {
  type: "EMAIL" | "IMEI" | "CPF" | "CNPJ" | "TELEFONE" | "PLACA" | "IPV4" | "IPV6" | "CHAVE_PIX" | "TEXTO";
  value: string;
  confidence: number;
};

const digits = (v: string) => v.replace(/\D/g, "");

export function detectIdentifier(input: string): DetectedIdentifier {
  const value = input.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { type: "EMAIL", value, confidence: .99 };
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return { type: "IPV4", value, confidence: .98 };
  if (value.includes(":") && /^[0-9a-fA-F:]+$/.test(value)) return { type: "IPV6", value, confidence: .9 };
  if (/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i.test(value.replace(/[-\s]/g, ""))) {
    return { type: "PLACA", value: value.toUpperCase().replace(/[-\s]/g, ""), confidence: .98 };
  }
  const d = digits(value);
  if (d.length === 15) return { type: "IMEI", value: d, confidence: .95 };
  if (d.length === 14) return { type: "CNPJ", value: d, confidence: .9 };
  if (d.length === 11 && !/^55/.test(d)) return { type: "CPF", value: d, confidence: .82 };
  if (d.length >= 10 && d.length <= 13) return { type: "TELEFONE", value: d, confidence: .88 };
  return { type: "TEXTO", value, confidence: .5 };
}
