// src/pages/HairSalon/Reservation.tsx
import { useParams } from 'react-router-dom';
import { Container, Paper, Typography } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

// 컴포넌트 임포트
import ProfileSection from '../../components/reservation/ProfileSection';
import CalendarSection from '../../components/reservation/CalendarSection';
import HolidayNotice from '../../components/reservation/HolidayNotice';
import TimeSlotsSection from '../../components/reservation/TimeSlotsSection';
import ServiceTypes from '../../components/reservation/ServiceTypes';
import ServiceMenus from '../../components/reservation/ServiceMenus';

// 훅 임포트
import { useStylistSchedule } from '../../hooks/reservation/useStylistSchedule';
import { useTimeSlots } from '../../hooks/reservation/useTimeSlots';
import { useServiceTypes } from '../../hooks/reservation/useServiceTypes';
import { useReservation } from '../../hooks/reservation/useReservation';

// 유틸리티 임포트
import { isHoliday, isAM } from '../../utils/reservation/dateUtils';

const Reservation = () => {
  const { stylistId } = useParams<{ stylistId: string }>();
  
  // 스타일리스트 정보 관련 훅
  const { 
    stylistSchedule, 
    isSelectedDateHoliday, 
    setIsSelectedDateHoliday 
  } = useStylistSchedule(stylistId);
  
  // 시간대 관련 훅
  const { 
    allTimeSlots, 
    selectedTime, 
    setSelectedTime,
    isLoading: isTimeLoading,
    fetchAvailableTimes,
    isTimeSlotAvailable: checkTimeAvailability
  } = useTimeSlots(stylistId);
  
  // 서비스 타입 관련 훅
  const {
    showServiceType,
    setShowServiceType,
    selectedType,
    setSelectedType,
    serviceMenus,
    setServiceMenus,
    isMenuLoading,
    serviceTypes,
    selectedMenuName,
    setSelectedMenuName,
    fetchServiceTypes,
    handleTypeChange,
    sliderRef,
    showLeftArrow,
    showRightArrow,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleTouchStart,
    handleTouchMove,
    handleArrowClick
  } = useServiceTypes();
  
  // 예약 정보 관련 훅
  const {
    selectedDate,
    reservationInfo,
    handleDateSelect: baseHandleDateSelect,
    handleMenuSelect: baseHandleMenuSelect
  } = useReservation(stylistId);

  // 시간대가 예약 가능한지 확인하는 함수
  const isTimeSlotAvailable = (time: string, isHoliday: boolean, date: dayjs.Dayjs | null) => {
    return checkTimeAvailability(time, isHoliday, date);
  };

  // 시간대 선택 핸들러
const handleTimeSelect = (time: string, isHoliday: boolean, date: dayjs.Dayjs | null) => {
  if (isTimeSlotAvailable(time, isHoliday, date)) {
    // 이미 선택된 시간을 다시 클릭하면 선택 취소
    if (selectedTime === time) {
      setSelectedTime(null);
      setShowServiceType(false);
      setSelectedType(null);
      setServiceMenus([]);
    } else {
      // 새로운 시간 선택
      setSelectedTime(time);
      setShowServiceType(true);
      setSelectedType(null); // 타입 초기화
      setServiceMenus([]); // 메뉴 초기화
      
      // 스타일리스트 정보가 있으면 서비스 타입 목록 조회
      if (stylistSchedule?.salonId) {
        fetchServiceTypes(stylistSchedule.salonId);
      }
    }
  }
};

  // 날짜 선택 핸들러
  const handleDateSelect = (date: dayjs.Dayjs | null) => {
    const resetTimeSelection = () => {
      setSelectedTime(null);
      setShowServiceType(false);
    };

    const resetServiceSelection = () => {
      setSelectedType(null);
      setServiceMenus([]);
      setSelectedMenuName(null);
    };

    baseHandleDateSelect(
      date,
      stylistSchedule,
      resetTimeSelection,
      resetServiceSelection,
      fetchAvailableTimes,
      setIsSelectedDateHoliday
    );
  };

  // 메뉴 선택 핸들러
  const handleMenuSelect = (menu: any) => {
    baseHandleMenuSelect(
      menu,
      stylistSchedule?.stylistId || null,
      selectedDate,
      selectedTime,
      selectedType,
      setSelectedMenuName
    );
  };

  if (!stylistSchedule) return <Typography>Loading...</Typography>;

  return (
    <Container disableGutters maxWidth="sm" sx={{ p: 0 }}>
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* 프로필 섹션 */}
        <ProfileSection stylistSchedule={stylistSchedule} />

        {/* 캘린더 섹션 */}
        <CalendarSection
          stylistSchedule={stylistSchedule}
          selectedDate={selectedDate}
          handleDateSelect={handleDateSelect}
          isHoliday={isHoliday}
        />
      </Paper>

      {/* 휴무일 안내 */}
      <HolidayNotice isSelectedDateHoliday={isSelectedDateHoliday} />

      {/* 시간대 선택 섹션 */}
      <TimeSlotsSection
         isSelectedDateHoliday={isSelectedDateHoliday}
         selectedDate={selectedDate} // 이 줄을 추가해야 합니다
         isLoading={isTimeLoading}
         allTimeSlots={allTimeSlots}
         selectedTime={selectedTime}
         handleTimeSelect={handleTimeSelect}
         isTimeSlotAvailable={isTimeSlotAvailable}
         isAM={isAM}
      />

      {/* 서비스 타입 선택 섹션 */}
      <ServiceTypes
        showServiceType={showServiceType}
        isMenuLoading={isMenuLoading}
        serviceTypes={serviceTypes}
        selectedType={selectedType}
        handleTypeChange={handleTypeChange}
        sliderRef={sliderRef}
        showLeftArrow={showLeftArrow}
        showRightArrow={showRightArrow}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUpOrLeave={handleMouseUpOrLeave}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        onArrowClick={handleArrowClick}
      />

      {/* 서비스 메뉴 선택 섹션 */}
      <ServiceMenus
        selectedType={selectedType}
        isMenuLoading={isMenuLoading}
        serviceMenus={serviceMenus}
        selectedMenuName={selectedMenuName}
        handleMenuSelect={handleMenuSelect}
      />
    </Container>
  );
};

export default Reservation;