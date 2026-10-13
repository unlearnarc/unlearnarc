package com.unlearnarc.quspool.repository;

import com.unlearnarc.quspool.entity.TopicPoolMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TopicPoolMappingRepository extends JpaRepository<TopicPoolMapping, String> {

    List<TopicPoolMapping> findByTopicId(String topicId);

    List<TopicPoolMapping> findByPoolId(String poolId);

    Optional<TopicPoolMapping> findByTopicIdAndPoolId(String topicId, String poolId);

    boolean existsByTopicIdAndPoolId(String topicId, String poolId);

    void deleteByPoolId(String poolId);
}
