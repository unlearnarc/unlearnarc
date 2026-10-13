package com.unlearnarc.quspool.repository;

import com.unlearnarc.quspool.entity.UserTestAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserTestAttemptRepository extends JpaRepository<UserTestAttempt, String> {

    Page<UserTestAttempt> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    List<UserTestAttempt> findByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserId(String userId);
}
