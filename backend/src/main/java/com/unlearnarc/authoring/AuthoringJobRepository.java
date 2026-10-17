package com.unlearnarc.authoring;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface AuthoringJobRepository extends JpaRepository<AuthoringJob, String> {
    List<AuthoringJob> findTop20ByOwnerOrderByCreatedAtDesc(String owner);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from AuthoringJob j where j.id = :id and j.owner = :owner")
    Optional<AuthoringJob> lockOwned(@Param("id") String id, @Param("owner") String owner);
}
