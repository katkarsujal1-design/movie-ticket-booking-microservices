package com.moviebooking.notification.config;

import com.moviebooking.notification.enums.NotificationType;
import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

import java.util.Map;

@Configuration
public class KafkaConfig {
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
            ConsumerFactory<String, String> consumerFactory,
            KafkaTemplate<Object, Object> template
    ) {
        ConcurrentKafkaListenerContainerFactory<String, String> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                template,
                (record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition())
        );
        factory.setCommonErrorHandler(new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 2L)));
        return factory;
    }

    @Bean
    Map<String, NotificationType> topicTypes(
            @Value("${notification.kafka.topics.booking-confirmed}") String bookingConfirmedTopic,
            @Value("${notification.kafka.topics.payment-success}") String paymentSuccessTopic,
            @Value("${notification.kafka.topics.payment-failed}") String paymentFailedTopic,
            @Value("${notification.kafka.topics.booking-cancelled}") String bookingCancelledTopic,
            @Value("${notification.kafka.topics.refund-initiated}") String refundInitiatedTopic,
            @Value("${notification.kafka.topics.refund-completed}") String refundCompletedTopic
    ) {
        return Map.of(
                bookingConfirmedTopic, NotificationType.BOOKING_CONFIRMED,
                paymentSuccessTopic, NotificationType.PAYMENT_SUCCESS,
                paymentFailedTopic, NotificationType.PAYMENT_FAILED,
                bookingCancelledTopic, NotificationType.BOOKING_CANCELLED,
                refundInitiatedTopic, NotificationType.REFUND_INITIATED,
                refundCompletedTopic, NotificationType.REFUND_COMPLETED
        );
    }
}
