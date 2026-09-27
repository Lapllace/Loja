export interface CepAddress {
  street: string;
  district: string;
  city: string;
  state: string;
}

/** Busca um CEP no ViaCEP sem lançar erro para falhas de rede ou CEP inexistente. */
export async function lookupCep(value: string): Promise<CepAddress | null> {
  const zipcode = value.replace(/\D/g, '').slice(0, 8);
  if (zipcode.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${zipcode}/json/`);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };

    if (data.erro) return null;

    return {
      street: data.logradouro ?? '',
      district: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    return null;
  }
}
