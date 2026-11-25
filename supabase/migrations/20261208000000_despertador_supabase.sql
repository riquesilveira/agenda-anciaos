-- "Despertador" do site pelo próprio Supabase (pg_cron + pg_net), no lugar do
-- agendamento do GitHub Actions, que não é confiável. A cada 10 minutos chama
-- /api/cron/tick: mantém o Render (plano free) acordado e, a partir das 18h,
-- dispara uma vez por dia o lembrete de véspera da escala.
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    return; -- banco de teste local: sem agendador
  end if;
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  perform cron.unschedule(jobid) from cron.job where jobname = 'despertar-site';
  perform cron.schedule(
    'despertar-site',
    '*/10 * * * *',
    $job$ select net.http_get(url := 'https://7lider.com.br/api/cron/tick', timeout_milliseconds := 60000) $job$
  );
end $$;
