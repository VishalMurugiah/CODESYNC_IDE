package com.codesync.repository;

import com.codesync.entity.Project;
import com.codesync.entity.ProjectFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectFileRepository extends JpaRepository<ProjectFile, Long> {
    
    List<ProjectFile> findByProjectOrderByFilePathAsc(Project project);

    List<ProjectFile> findByProjectAndFilePathStartingWithOrderByFilePathAsc(Project project, String pathPrefix);

    Optional<ProjectFile> findByProjectAndFilePath(Project project, String filePath);

    boolean existsByProjectAndFilePath(Project project, String filePath);

    @Query("SELECT f FROM ProjectFile f WHERE f.project = :project AND f.name LIKE %:name%")
    List<ProjectFile> findByProjectAndNameContaining(@Param("project") Project project, @Param("name") String name);
    
    @Query("SELECT COUNT(f) FROM ProjectFile f WHERE f.project = :project")
    Long getFileCountByProject(@Param("project") Project project);
    
    void deleteByProject(Project project);

    List<ProjectFile> findByProjectId(Long projectId);
    
    Optional<ProjectFile> findByProjectIdAndName(Long projectId, String name);
    
    List<ProjectFile> findByProjectIdAndLanguage(Long projectId, String language);
}
