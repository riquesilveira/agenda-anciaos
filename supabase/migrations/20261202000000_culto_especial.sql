-- Culto especial na escala de pregação: qualquer dia (semana de oração,
-- Santa Ceia, batismo…), com um nome próprio em `titulo`.
alter type culto_pregacao add value if not exists 'especial';
alter table escala_pregacao add column titulo text check (titulo is null or char_length(titulo) <= 80);

-- O dia da semana só vale para os cultos fixos. (culto::text evita usar o
-- valor novo do enum na mesma transação em que ele foi criado.)
alter table escala_pregacao drop constraint escala_pregacao_check;
alter table escala_pregacao add constraint escala_pregacao_check check (
  (culto::text = 'sabado_manha' and extract(dow from data) = 6)
  or (culto::text = 'quarta' and extract(dow from data) = 3)
  or (culto::text = 'domingo_noite' and extract(dow from data) = 0)
  or culto::text = 'especial'
);
