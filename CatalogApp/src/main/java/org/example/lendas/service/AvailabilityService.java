package org.example.lendas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.example.lendas.repository.AvailabilityRepository;
import org.example.lendas.util.StringUtils;
import org.example.lendas.util.ValidationUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AvailabilityService {

    private final AvailabilityRepository availabilityRepository;

    public AvailabilityService(AvailabilityRepository availabilityRepository) {
        this.availabilityRepository = availabilityRepository;
    }

    @Transactional(readOnly = true)
    public JsonNode checkDataAvailability(String processTypeSchema, String processTypeName,
                                          String processIds, String featureIds, String spatialFilter,
                                          String startTime, String endTime) {
        ValidationUtils.requireNonBlank(processTypeSchema, "schema");
        ValidationUtils.requireNonBlank(processTypeName, "name");

        JsonNode result = availabilityRepository.checkDataAvailability(
                processTypeSchema.trim(),
                processTypeName.trim(),
                StringUtils.nullIfBlank(processIds),
                StringUtils.nullIfBlank(featureIds),
                StringUtils.nullIfBlank(spatialFilter),
                ValidationUtils.parseDateTime(startTime, "start-time"),
                ValidationUtils.parseDateTime(endTime, "end-time"));

        return result == null || result.isNull() || result.isEmpty()
                ? JsonNodeFactory.instance.objectNode()
                : result;
    }
}

