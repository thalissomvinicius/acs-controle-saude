-- Execute este arquivo no SQL Editor do Supabase se algum cadastro retornar:
-- "new row violates row-level security policy".
-- Ele é tolerante a tabelas ausentes.

do $$
begin
  if to_regclass('public.usuarios') is not null then
    alter table public.usuarios enable row level security;
    drop policy if exists "usuarios_acessam_proprio_perfil" on public.usuarios;
    create policy "usuarios_acessam_proprio_perfil" on public.usuarios
    for all to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);
  end if;

  if to_regclass('public.logradouros') is not null then
    alter table public.logradouros enable row level security;
    drop policy if exists "logradouros_do_usuario" on public.logradouros;
    create policy "logradouros_do_usuario" on public.logradouros
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);
  end if;

  if to_regclass('public.familias') is not null then
    alter table public.familias enable row level security;
    drop policy if exists "familias_do_usuario" on public.familias;
    create policy "familias_do_usuario" on public.familias
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);
  end if;

  if to_regclass('public.moradores') is not null then
    alter table public.moradores enable row level security;
    drop policy if exists "moradores_do_usuario" on public.moradores;
    create policy "moradores_do_usuario" on public.moradores
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);
  end if;

  if to_regclass('public.medicamentos') is not null then
    alter table public.medicamentos enable row level security;
    drop policy if exists "medicamentos_do_usuario" on public.medicamentos;
    create policy "medicamentos_do_usuario" on public.medicamentos
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);
  end if;

  if to_regclass('public.visitas') is not null then
    alter table public.visitas enable row level security;
    drop policy if exists "visitas_do_usuario" on public.visitas;
    create policy "visitas_do_usuario" on public.visitas
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);
  end if;

  if to_regclass('public.historico_visitas') is not null then
    alter table public.historico_visitas enable row level security;
    drop policy if exists "historico_do_usuario" on public.historico_visitas;
    create policy "historico_do_usuario" on public.historico_visitas
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);
  end if;

  if to_regclass('public.configuracoes') is not null then
    alter table public.configuracoes enable row level security;
    drop policy if exists "configuracoes_do_usuario" on public.configuracoes;
    create policy "configuracoes_do_usuario" on public.configuracoes
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);
  end if;
end $$;
