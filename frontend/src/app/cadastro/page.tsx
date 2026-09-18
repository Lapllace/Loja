'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { inputClassName } from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cpf: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/loja');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone || undefined,
      cpf: formData.cpf || undefined,
    });

    if (result.success) {
      router.push('/loja');
    } else {
      setError(result.error || 'Erro ao criar conta');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Criar nova conta
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Ou{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary-dark">
              faça login na sua conta existente
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                Nome completo *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={inputClassName}
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={inputClassName}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                Telefone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={inputClassName}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-foreground mb-1">
                CPF
              </label>
              <input
                id="cpf"
                name="cpf"
                type="text"
                value={formData.cpf}
                onChange={handleChange}
                className={inputClassName}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Senha *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={inputClassName}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
                Confirmar senha *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={inputClassName}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </div>

          <div className="text-center">
            <Link href="/loja" className="text-sm text-muted-foreground hover:text-primary">
              Voltar para a loja
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
