"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { updateProfile } from "@/app/(panel)/dashboard/minha-conta/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";

export function AccountForm({
  email,
  firstName,
  lastName,
}: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateProfile(null, formData);
      if (res?.ok) {
        toast.success("Dados salvos.");
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meus dados</CardTitle>
        <CardDescription>
          Nome e sobrenome aparecem no menu lateral do painel, no lugar do
          e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={firstName}
                placeholder="Loan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={lastName}
                placeholder="Fuzari"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={email} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              O e-mail de login é gerenciado no Supabase (Auth → Users) — não
              dá pra trocar por aqui.
            </p>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
