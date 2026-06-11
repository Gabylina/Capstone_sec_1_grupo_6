-- Ampliar columna encuesta_satisfaccion de VARCHAR(300) a VARCHAR(1000)
-- Ejecutar en prod: docker exec -it llconsulting_db psql -U postgres -d defaultdb -f ...

ALTER TABLE contratacion
  ALTER COLUMN encuesta_satisfaccion TYPE VARCHAR(1000);
