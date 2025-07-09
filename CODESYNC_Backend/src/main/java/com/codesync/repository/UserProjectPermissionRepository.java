package com.codesync.repository;

import com.codesync.entity.UserProjectPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserProjectPermissionRepository extends JpaRepository<UserProjectPermission, Long> {

    List<UserProjectPermission> findByUserId(Long userId);

    List<UserProjectPermission> findByProjectId(Long projectId);

    Optional<UserProjectPermission> findByUserIdAndProjectId(Long userId, Long projectId);

    List<UserProjectPermission> findByUserIdAndPermission(Long userId, UserProjectPermission.Permission permission);
}
