package com.IMJM.user.service;

import com.IMJM.admin.repository.ReviewReplyRepository;
import com.IMJM.admin.repository.SalonRepository;
import com.IMJM.common.cloud.NCPObjectStorageService;
import com.IMJM.common.entity.*;
import com.IMJM.reservation.repository.ReservationRepository;
import com.IMJM.salon.repository.ReviewPhotosRepository;
import com.IMJM.salon.repository.ReviewRepository;
import com.IMJM.user.dto.ReviewSaveRequestDto;
import com.IMJM.user.dto.UserReservationResponseDto;
import com.IMJM.user.dto.UserReviewReplyResponseDto;
import com.IMJM.user.dto.UserReviewResponseDto;
import com.IMJM.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Log4j2
@Service
@RequiredArgsConstructor
public class MyPageService {

    private final ReservationRepository reservationRepository;
    private final ReviewPhotosRepository reviewPhotosRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final NCPObjectStorageService storageService;
    private final SalonRepository salonRepository;
    private final ReviewReplyRepository reviewReplyRepository;


    @Value("${ncp.bucket-name}")
    private String bucketName;

    public List<UserReservationResponseDto> getUserReservations(String userId) {
        List<Object[]> results = reservationRepository.findByUser_IdNative(userId);

        return results.stream()
                .map(UserReservationResponseDto::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public Long saveReview(ReviewSaveRequestDto requestDto, List<MultipartFile> images) {

        Users user = userRepository.findById(requestDto.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));

        Salon salon = salonRepository.findById(requestDto.getSalonId())
                .orElseThrow(() -> new EntityNotFoundException("미용실을 찾을 수 없습니다."));

        Reservation reservation = null;
        if (requestDto.getReservationId() != null) {
            reservation = reservationRepository.findById(requestDto.getReservationId())
                    .orElseThrow(() -> new EntityNotFoundException("예약 정보를 찾을 수 없습니다."));
        }

        String reviewTag = null;
        if (requestDto.getTags() != null && !requestDto.getTags().isEmpty()) {
            reviewTag = String.join(",", requestDto.getTags());
            if (reviewTag.length() > 100) {
                reviewTag = reviewTag.substring(0, 100);
            }
        }

        Review review = Review.builder()
                .user(user)
                .salon(salon)
                .reservation(reservation)
                .score(BigDecimal.valueOf(requestDto.getRating()))
                .content(requestDto.getReviewText())
                .reviewTag(reviewTag)
                .regDate(LocalDateTime.now())
                .build();

        Review savedReview = reviewRepository.save(review);

        if (images != null && !images.isEmpty()) {
            saveReviewImages(savedReview.getId(), images);
        }

        return savedReview.getId();
    }

    private void saveReviewImages(Long reviewId, List<MultipartFile> images) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new EntityNotFoundException("리뷰를 찾을 수 없습니다: " + reviewId));

        List<ReviewPhotos> reviewPhotos = new ArrayList<>();

        for (int i = 0; i < images.size(); i++) {
            MultipartFile image = images.get(i);
            String photoUrl = uploadReviewImageToStorage(reviewId, image);

            ReviewPhotos reviewPhoto = ReviewPhotos.builder()
                    .review(review)
                    .photoUrl(photoUrl)
                    .photoOrder(i)
                    .uploadDate(LocalDateTime.now())
                    .build();

            reviewPhotos.add(reviewPhoto);
        }

        reviewPhotosRepository.saveAll(reviewPhotos);
    }

    private String uploadReviewImageToStorage(Long reviewId, MultipartFile image) {
        try {
            String originalFilename = image.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));

                validateFileExtension(extension);
            }
            String uuid = UUID.randomUUID().toString();
            String newFilename = "reviews/" + reviewId + "/" + uuid + extension;

            storageService.upload(newFilename, image.getInputStream());

            return getFullImageUrl(newFilename);

        } catch (IOException e) {
            log.error("이미지 업로드 실패: {}", e.getMessage());
            throw new RuntimeException("이미지 업로드 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    private void validateFileExtension(String ext) {
        List<String> allowedExtensions = Arrays.asList(".jpg", ".jpeg", ".png", ".gif", ".webp");
        if (!allowedExtensions.contains(ext.toLowerCase())) {
            throw new IllegalArgumentException("지원되지 않는 파일 형식입니다.");
        }
    }

    private String getFullImageUrl(String s3Path) {
        String baseUrl = "https://" + bucketName + ".kr.object.ncloudstorage.com";
        return baseUrl + "/" + s3Path;
    }


    public UserReviewResponseDto getReviewWithPhotos(Long reviewId) {
        Review review = reviewRepository.findByReviewId(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다."));

        List<ReviewPhotos> reviewPhotos = reviewPhotosRepository.findByReview_IdOrderByPhotoOrderAsc(reviewId);

        if (reviewPhotos.isEmpty()) {
            reviewPhotos = new ArrayList<>();
        }

        String reviewTag = review.getReviewTag();
        List<String> reviewTags = (reviewTag != null && !reviewTag.isEmpty())
                ? Arrays.asList(reviewTag.split(","))
                : new ArrayList<>();

        List<String> reviewPhotoUrls = reviewPhotos.stream()
                .map(ReviewPhotos::getPhotoUrl)
                .collect(Collectors.toList());

        return new UserReviewResponseDto(
                review.getId(),
                review.getUser().getId(),
                review.getReservation().getId(),
                review.getContent(),
                review.getScore(),
                review.getRegDate(),
                reviewTags,
                reviewPhotoUrls
        );
    }

    public UserReviewReplyResponseDto getReviewReplyByReviewId(Long reviewId) {
        Optional<ReviewReply> reviewReply = reviewReplyRepository.findOptionalByReviewId(reviewId);

        return reviewReply.map(UserReviewReplyResponseDto::new)
                .orElse(null);
    }
}

