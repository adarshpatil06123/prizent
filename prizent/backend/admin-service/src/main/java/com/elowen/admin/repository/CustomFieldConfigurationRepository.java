package com.elowen.admin.repository;

import com.elowen.admin.entity.CustomFieldConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomFieldConfigurationRepository extends JpaRepository<CustomFieldConfiguration, Long> {
    
    Optional<CustomFieldConfiguration> findByIdAndClientId(Long id, Integer clientId);
    
    List<CustomFieldConfiguration> findAllByClientIdAndModuleOrderByCreateDateTimeDesc(Integer clientId, String module);
    
    List<CustomFieldConfiguration> findAllByClientIdAndModuleAndEnabledTrueOrderByCreateDateTimeDesc(Integer clientId, String module);
    
    List<CustomFieldConfiguration> findAllByClientIdOrderByCreateDateTimeDesc(Integer clientId);
    
    List<CustomFieldConfiguration> findAllByClientIdAndEnabledTrueOrderByCreateDateTimeDesc(Integer clientId);
    
    boolean existsByClientIdAndModuleAndNameAndEnabledTrue(Integer clientId, String module, String name);
    
    // For duplicate check during create/update
    boolean existsByClientIdAndModuleAndNameAndIdNot(Integer clientId, String module, String name, Long id);
    
    boolean existsByClientIdAndModuleAndName(Integer clientId, String module, String name);
}
