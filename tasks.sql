select CONVERT(varchar(max),A.Descricao) as descricao, U.UsuNome as usuario
  from Atividade A, Tarefa T, Usuario U
  where U.UsuID = A.UsuID
    and A.Tarid = T.Tarid
    and T.Tarid = @tarefaId