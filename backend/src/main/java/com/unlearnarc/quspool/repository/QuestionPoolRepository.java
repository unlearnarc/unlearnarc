package com.unlearnarc.quspool.repository;

import com.unlearnarc.quspool.entity.QuestionPool;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionPoolRepository extends JpaRepository<QuestionPool, String> {

    List<QuestionPool> findByScopeType(ScopeType scopeType);

    List<QuestionPool> findByIsActiveTrue();

    boolean existsByNameAndScopeType(String name, ScopeType scopeType);
}
