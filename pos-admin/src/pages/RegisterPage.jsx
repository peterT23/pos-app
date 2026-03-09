import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const countries = [
  { value: 'af', label: 'Afghanistan', code: '+93' },
  { value: 'al', label: 'Albania', code: '+355' },
  { value: 'dz', label: 'Algeria', code: '+213' },
  { value: 'ad', label: 'Andorra', code: '+376' },
  { value: 'ao', label: 'Angola', code: '+244' },
  { value: 'ar', label: 'Argentina', code: '+54' },
  { value: 'am', label: 'Armenia', code: '+374' },
  { value: 'au', label: 'Australia', code: '+61' },
  { value: 'at', label: 'Áo', code: '+43' },
  { value: 'az', label: 'Azerbaijan', code: '+994' },
  { value: 'bs', label: 'Bahamas', code: '+1-242' },
  { value: 'bh', label: 'Bahrain', code: '+973' },
  { value: 'bd', label: 'Bangladesh', code: '+880' },
  { value: 'by', label: 'Belarus', code: '+375' },
  { value: 'be', label: 'Bỉ', code: '+32' },
  { value: 'bz', label: 'Belize', code: '+501' },
  { value: 'bj', label: 'Benin', code: '+229' },
  { value: 'bt', label: 'Bhutan', code: '+975' },
  { value: 'bo', label: 'Bolivia', code: '+591' },
  { value: 'ba', label: 'Bosnia và Herzegovina', code: '+387' },
  { value: 'bw', label: 'Botswana', code: '+267' },
  { value: 'br', label: 'Brazil', code: '+55' },
  { value: 'bn', label: 'Brunei', code: '+673' },
  { value: 'bg', label: 'Bulgaria', code: '+359' },
  { value: 'bf', label: 'Burkina Faso', code: '+226' },
  { value: 'bi', label: 'Burundi', code: '+257' },
  { value: 'kh', label: 'Campuchia', code: '+855' },
  { value: 'cm', label: 'Cameroon', code: '+237' },
  { value: 'ca', label: 'Canada', code: '+1' },
  { value: 'cv', label: 'Cape Verde', code: '+238' },
  { value: 'cf', label: 'Cộng hòa Trung Phi', code: '+236' },
  { value: 'td', label: 'Chad', code: '+235' },
  { value: 'cl', label: 'Chile', code: '+56' },
  { value: 'cn', label: 'Trung Quốc', code: '+86' },
  { value: 'co', label: 'Colombia', code: '+57' },
  { value: 'km', label: 'Comoros', code: '+269' },
  { value: 'cg', label: 'Congo', code: '+242' },
  { value: 'cr', label: 'Costa Rica', code: '+506' },
  { value: 'hr', label: 'Croatia', code: '+385' },
  { value: 'cu', label: 'Cuba', code: '+53' },
  { value: 'cy', label: 'Síp', code: '+357' },
  { value: 'cz', label: 'Séc', code: '+420' },
  { value: 'dk', label: 'Đan Mạch', code: '+45' },
  { value: 'dj', label: 'Djibouti', code: '+253' },
  { value: 'do', label: 'Cộng hòa Dominica', code: '+1-809' },
  { value: 'ec', label: 'Ecuador', code: '+593' },
  { value: 'eg', label: 'Ai Cập', code: '+20' },
  { value: 'sv', label: 'El Salvador', code: '+503' },
  { value: 'gq', label: 'Guinea Xích Đạo', code: '+240' },
  { value: 'er', label: 'Eritrea', code: '+291' },
  { value: 'ee', label: 'Estonia', code: '+372' },
  { value: 'sz', label: 'Eswatini', code: '+268' },
  { value: 'et', label: 'Ethiopia', code: '+251' },
  { value: 'fj', label: 'Fiji', code: '+679' },
  { value: 'fi', label: 'Phần Lan', code: '+358' },
  { value: 'fr', label: 'Pháp', code: '+33' },
  { value: 'ga', label: 'Gabon', code: '+241' },
  { value: 'gm', label: 'Gambia', code: '+220' },
  { value: 'ge', label: 'Georgia', code: '+995' },
  { value: 'de', label: 'Đức', code: '+49' },
  { value: 'gh', label: 'Ghana', code: '+233' },
  { value: 'gr', label: 'Hy Lạp', code: '+30' },
  { value: 'gl', label: 'Greenland', code: '+299' },
  { value: 'gt', label: 'Guatemala', code: '+502' },
  { value: 'gn', label: 'Guinea', code: '+224' },
  { value: 'gy', label: 'Guyana', code: '+592' },
  { value: 'ht', label: 'Haiti', code: '+509' },
  { value: 'hn', label: 'Honduras', code: '+504' },
  { value: 'hk', label: 'Hồng Kông', code: '+852' },
  { value: 'hu', label: 'Hungary', code: '+36' },
  { value: 'is', label: 'Iceland', code: '+354' },
  { value: 'in', label: 'Ấn Độ', code: '+91' },
  { value: 'id', label: 'Indonesia', code: '+62' },
  { value: 'ir', label: 'Iran', code: '+98' },
  { value: 'iq', label: 'Iraq', code: '+964' },
  { value: 'ie', label: 'Ireland', code: '+353' },
  { value: 'il', label: 'Israel', code: '+972' },
  { value: 'it', label: 'Ý', code: '+39' },
  { value: 'jm', label: 'Jamaica', code: '+1-876' },
  { value: 'jp', label: 'Nhật Bản', code: '+81' },
  { value: 'jo', label: 'Jordan', code: '+962' },
  { value: 'kz', label: 'Kazakhstan', code: '+7' },
  { value: 'ke', label: 'Kenya', code: '+254' },
  { value: 'ki', label: 'Kiribati', code: '+686' },
  { value: 'kw', label: 'Kuwait', code: '+965' },
  { value: 'kg', label: 'Kyrgyzstan', code: '+996' },
  { value: 'la', label: 'Lào', code: '+856' },
  { value: 'lv', label: 'Latvia', code: '+371' },
  { value: 'lb', label: 'Lebanon', code: '+961' },
  { value: 'ls', label: 'Lesotho', code: '+266' },
  { value: 'lr', label: 'Liberia', code: '+231' },
  { value: 'ly', label: 'Libya', code: '+218' },
  { value: 'li', label: 'Liechtenstein', code: '+423' },
  { value: 'lt', label: 'Lithuania', code: '+370' },
  { value: 'lu', label: 'Luxembourg', code: '+352' },
  { value: 'mo', label: 'Ma Cao', code: '+853' },
  { value: 'mg', label: 'Madagascar', code: '+261' },
  { value: 'mw', label: 'Malawi', code: '+265' },
  { value: 'my', label: 'Malaysia', code: '+60' },
  { value: 'mv', label: 'Maldives', code: '+960' },
  { value: 'ml', label: 'Mali', code: '+223' },
  { value: 'mt', label: 'Malta', code: '+356' },
  { value: 'mh', label: 'Marshall Islands', code: '+692' },
  { value: 'mr', label: 'Mauritania', code: '+222' },
  { value: 'mu', label: 'Mauritius', code: '+230' },
  { value: 'mx', label: 'Mexico', code: '+52' },
  { value: 'fm', label: 'Micronesia', code: '+691' },
  { value: 'md', label: 'Moldova', code: '+373' },
  { value: 'mc', label: 'Monaco', code: '+377' },
  { value: 'mn', label: 'Mông Cổ', code: '+976' },
  { value: 'me', label: 'Montenegro', code: '+382' },
  { value: 'ma', label: 'Ma Rốc', code: '+212' },
  { value: 'mz', label: 'Mozambique', code: '+258' },
  { value: 'mm', label: 'Myanmar', code: '+95' },
  { value: 'na', label: 'Namibia', code: '+264' },
  { value: 'nr', label: 'Nauru', code: '+674' },
  { value: 'np', label: 'Nepal', code: '+977' },
  { value: 'nl', label: 'Hà Lan', code: '+31' },
  { value: 'nz', label: 'New Zealand', code: '+64' },
  { value: 'ni', label: 'Nicaragua', code: '+505' },
  { value: 'ne', label: 'Niger', code: '+227' },
  { value: 'ng', label: 'Nigeria', code: '+234' },
  { value: 'kp', label: 'Triều Tiên', code: '+850' },
  { value: 'kr', label: 'Hàn Quốc', code: '+82' },
  { value: 'no', label: 'Na Uy', code: '+47' },
  { value: 'om', label: 'Oman', code: '+968' },
  { value: 'pk', label: 'Pakistan', code: '+92' },
  { value: 'pa', label: 'Panama', code: '+507' },
  { value: 'pg', label: 'Papua New Guinea', code: '+675' },
  { value: 'py', label: 'Paraguay', code: '+595' },
  { value: 'pe', label: 'Peru', code: '+51' },
  { value: 'ph', label: 'Philippines', code: '+63' },
  { value: 'pl', label: 'Ba Lan', code: '+48' },
  { value: 'pt', label: 'Bồ Đào Nha', code: '+351' },
  { value: 'qa', label: 'Qatar', code: '+974' },
  { value: 'ro', label: 'Romania', code: '+40' },
  { value: 'ru', label: 'Nga', code: '+7' },
  { value: 'rw', label: 'Rwanda', code: '+250' },
  { value: 'sa', label: 'Ả Rập Xê Út', code: '+966' },
  { value: 'sn', label: 'Senegal', code: '+221' },
  { value: 'rs', label: 'Serbia', code: '+381' },
  { value: 'sc', label: 'Seychelles', code: '+248' },
  { value: 'sl', label: 'Sierra Leone', code: '+232' },
  { value: 'sg', label: 'Singapore', code: '+65' },
  { value: 'sk', label: 'Slovakia', code: '+421' },
  { value: 'si', label: 'Slovenia', code: '+386' },
  { value: 'za', label: 'Nam Phi', code: '+27' },
  { value: 'es', label: 'Tây Ban Nha', code: '+34' },
  { value: 'lk', label: 'Sri Lanka', code: '+94' },
  { value: 'sd', label: 'Sudan', code: '+249' },
  { value: 'se', label: 'Thụy Điển', code: '+46' },
  { value: 'ch', label: 'Thụy Sĩ', code: '+41' },
  { value: 'sy', label: 'Syria', code: '+963' },
  { value: 'tw', label: 'Đài Loan', code: '+886' },
  { value: 'tj', label: 'Tajikistan', code: '+992' },
  { value: 'tz', label: 'Tanzania', code: '+255' },
  { value: 'th', label: 'Thái Lan', code: '+66' },
  { value: 'tl', label: 'Timor-Leste', code: '+670' },
  { value: 'tn', label: 'Tunisia', code: '+216' },
  { value: 'tr', label: 'Thổ Nhĩ Kỳ', code: '+90' },
  { value: 'tm', label: 'Turkmenistan', code: '+993' },
  { value: 'ug', label: 'Uganda', code: '+256' },
  { value: 'ua', label: 'Ukraine', code: '+380' },
  { value: 'ae', label: 'UAE', code: '+971' },
  { value: 'gb', label: 'Anh', code: '+44' },
  { value: 'us', label: 'Mỹ', code: '+1' },
  { value: 'uy', label: 'Uruguay', code: '+598' },
  { value: 'uz', label: 'Uzbekistan', code: '+998' },
  { value: 've', label: 'Venezuela', code: '+58' },
  { value: 'vn', label: 'Việt Nam', code: '+84' },
  { value: 'ye', label: 'Yemen', code: '+967' },
  { value: 'zm', label: 'Zambia', code: '+260' },
  { value: 'zw', label: 'Zimbabwe', code: '+263' },
];

const PROVINCES_API = 'https://provinces.open-api.vn/api/p/';

const industryOptions = [
  { value: 'grocery', label: 'Tạp hóa - Siêu thị mini', group: 'Bán lẻ' },
  { value: 'fashion', label: 'Thời trang - Phụ kiện', group: 'Bán lẻ' },
  { value: 'cosmetic', label: 'Mỹ phẩm - Chăm sóc cá nhân', group: 'Bán lẻ' },
  { value: 'phone', label: 'Điện thoại - Điện máy', group: 'Bán lẻ' },
  { value: 'book', label: 'Sách - Văn phòng phẩm', group: 'Bán lẻ' },
  { value: 'pharmacy', label: 'Nhà thuốc', group: 'Bán lẻ' },
  { value: 'fnb', label: 'Quán ăn - Nhà hàng', group: 'Ăn uống' },
  { value: 'cafe', label: 'Cafe - Trà sữa', group: 'Ăn uống' },
  { value: 'bakery', label: 'Bánh ngọt', group: 'Ăn uống' },
  { value: 'hotel', label: 'Khách sạn - Lưu trú', group: 'Dịch vụ' },
  { value: 'spa', label: 'Spa - Salon', group: 'Dịch vụ' },
  { value: 'gym', label: 'Phòng tập - Fitness', group: 'Dịch vụ' },
  { value: 'education', label: 'Giáo dục - Trung tâm', group: 'Dịch vụ' },
  { value: 'other', label: 'Khác', group: 'Khác' },
];

function getFlagEmoji(code) {
  if (!code || code.length !== 2) return '';
  const base = 0x1f1e6;
  const chars = code.toUpperCase().split('').map((char) => base + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...chars);
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [agree, setAgree] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const selectedCountry = countries.find((item) => item.value === country) || null;
  const [regionOptions, setRegionOptions] = useState([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const selectedRegion = regionOptions.find((item) => item.value === region) || null;
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const geoLoadedRef = useRef(false);
  const [industry, setIndustry] = useState(null);
  const [storePassword, setStorePassword] = useState('');
  const [storePasswordError, setStorePasswordError] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [showSurveyPassword, setShowSurveyPassword] = useState(false);
  const [showSuccessPassword, setShowSuccessPassword] = useState(true);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyError, setSurveyError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const [provinceCache] = useState(() => new Map());

  const refreshCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/captcha`);
      const data = await response.json().catch(() => ({}));
      setCaptchaId(data.captchaId || '');
      setCaptchaImage(data.image || '');
      setCaptchaInput('');
      setCaptchaError('');
    } catch {
      setCaptchaError('Không tải được captcha');
    } finally {
      setCaptchaLoading(false);
    }
  }, [API_BASE_URL]);

  const loadRegions = useCallback(async (countryCode) => {
    if (!countryCode) {
      setRegionOptions([]);
      return;
    }
    if (provinceCache.has(countryCode)) {
      setRegionOptions(provinceCache.get(countryCode));
      return;
    }
    if (countryCode !== 'vn') {
      setRegionOptions([]);
      return;
    }
    setRegionLoading(true);
    try {
      const response = await fetch(PROVINCES_API);
      const data = await response.json().catch(() => []);
      const options = Array.isArray(data)
        ? data.map((item) => ({
          value: String(item.code),
          label: item.name,
        }))
        : [];
      provinceCache.set(countryCode, options);
      setRegionOptions(options);
    } catch {
      setRegionOptions([]);
    } finally {
      setRegionLoading(false);
    }
  }, [provinceCache]);

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  useEffect(() => {
    const setCountryFromGeo = async () => {
      if (geoLoadedRef.current || country) return;
      geoLoadedRef.current = true;
      try {
        const response = await fetch(`${API_BASE_URL}/api/public/geo`);
        const data = await response.json().catch(() => ({}));
        const code = String(data?.countryCode || '').toLowerCase();
        if (countries.some((item) => item.value === code)) {
          setCountry(code);
          return;
        }
      } catch {
        // ignore
      }
      const locale = (navigator.language || '').toLowerCase();
      if (locale.startsWith('vi') && countries.some((item) => item.value === 'vn')) {
        setCountry('vn');
      }
    };
    setCountryFromGeo();
  }, [API_BASE_URL, country]);

  useEffect(() => {
    loadRegions(country);
  }, [country, loadRegions]);

  const handleContinue = async () => {
    if (!captchaId) {
      setCaptchaError('Captcha chưa sẵn sàng');
      return;
    }
    if (!captchaInput) {
      setCaptchaError('Vui lòng nhập mã xác thực');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaId, text: captchaInput }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setCaptchaError(data.message || 'Mã xác thực không đúng');
        return;
      }
      setCaptchaError('');
      setStep('welcome');
    } catch {
      setCaptchaError('Không kiểm tra được captcha');
    }
  };

  if (step === 'welcome') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper sx={{ width: 520, p: 5, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Chào mừng bạn!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Chỉ còn vài bước để hoàn tất đăng ký
          </Typography>
          <Button variant="contained" size="large" onClick={() => setStep('survey')}>
            Bắt đầu khảo sát
          </Button>
        </Paper>
      </Box>
    );
  }

  if (step === 'survey') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper sx={{ width: 520, p: 5, borderRadius: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
            Hãy tạo cửa hàng của bạn
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={industryOptions}
              value={industry}
              onChange={(_, newValue) => setIndustry(newValue)}
              groupBy={(option) => option.group}
              getOptionLabel={(option) => option.label}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Chọn ngành hàng kinh doanh"
                  fullWidth
                />
              )}
            />
            <TextField
              label="Đặt tên cho cửa hàng của bạn"
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              fullWidth
            />
            <TextField
              label="Nhập mật khẩu (tối thiểu 8 ký tự)"
              type={showSurveyPassword ? 'text' : 'password'}
              value={storePassword}
              onChange={(event) => {
                const value = event.target.value;
                setStorePassword(value);
                if (value.length > 0 && value.length < 8) {
                  setStorePasswordError('Mật khẩu tối thiểu 8 ký tự');
                } else {
                  setStorePasswordError('');
                }
              }}
              error={Boolean(storePasswordError)}
              helperText={storePasswordError || ' '}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowSurveyPassword((prev) => !prev)}
                      edge="end"
                      aria-label={showSurveyPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showSurveyPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
            {surveyError && (
              <Typography variant="body2" color="error">
                {surveyError}
              </Typography>
            )}
            <Button
              variant="contained"
              size="large"
              disabled={surveyLoading}
              onClick={async () => {
                if (!phone.trim()) {
                  setPhoneError('Vui lòng nhập số điện thoại');
                  return;
                }
                if (!fullName.trim()) {
                  setSurveyError('Vui lòng nhập họ tên');
                  return;
                }
                if (!email.trim()) {
                  setSurveyError('Vui lòng nhập email');
                  return;
                }
                if (!storeName.trim()) {
                  setSurveyError('Vui lòng nhập tên cửa hàng');
                  return;
                }
                if (storePassword.length < 8) {
                  setStorePasswordError('Mật khẩu tối thiểu 8 ký tự');
                  return;
                }
                setSurveyError('');
                setSurveyLoading(true);
                try {
                  const response = await fetch(`${API_BASE_URL}/api/public/register-trial`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: fullName,
                      email,
                      phone,
                      password: storePassword,
                      storeName,
                      industry: industry?.value || '',
                      country,
                      region,
                    }),
                  });
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok) {
                    setSurveyError(data?.message || 'Không thể tạo tài khoản');
                    return;
                  }
                  setLoginIdentifier(data.loginIdentifier || email);
                  const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ identifier: email, password: storePassword }),
                  });
                  const loginData = await loginRes.json().catch(() => ({}));
                  if (loginRes.ok && loginData.token) {
                    login(loginData.token, loginData.user, null);
                  }
                  setStep('success');
                } catch {
                  setSurveyError('Không thể tạo tài khoản');
                } finally {
                  setSurveyLoading(false);
                }
              }}
            >
              {surveyLoading ? 'Đang tạo...' : 'Tạo cửa hàng'}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (step === 'success') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper sx={{ width: 560, p: 5, borderRadius: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: '#e8f5e9',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2e7d32',
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              ✓
            </Box>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
            Cửa hàng của bạn đã sẵn sàng
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#e3f2fd', textAlign: 'left' }}>
              <Typography variant="body2" color="text.secondary">
                Tên gian hàng
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1565c0' }}>
                {storeName || '---'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#e8f5e9', textAlign: 'left' }}>
              <Typography variant="body2" color="text.secondary">
                Tên đăng nhập
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                {loginIdentifier || '---'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#fff3e0', textAlign: 'left' }}>
              <Typography variant="body2" color="text.secondary">
                Mật khẩu
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#ef6c00' }}>
                  {showSuccessPassword ? storePassword || '---' : '••••••••'}
                </Typography>
                <IconButton size="small" onClick={() => setShowSuccessPassword((prev) => !prev)}>
                  {showSuccessPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </Box>
            </Paper>
          </Box>
          <Button variant="contained" size="large" onClick={() => navigate('/login')}>
            Bắt đầu quản lý
          </Button>
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Box component="img" src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store" sx={{ height: 34 }} />
            <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/c/cd/Get_it_on_Google_play.svg" alt="Google Play" sx={{ height: 34 }} />
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eef2f7', display: 'flex' }}>
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          background: 'linear-gradient(135deg, #0c3c77 0%, #0a2a54 100%)',
          p: 6,
        }}
      >
        <Box sx={{ maxWidth: 380 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Quản lý dễ dàng
            <br />
            Bán hàng đơn giản
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Hỗ trợ đăng ký 1800 6162
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper sx={{ width: 440, p: 4, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
            Tạo tài khoản dùng thử miễn phí
          </Typography>
          

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nhập họ tên"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              fullWidth
            />

            <TextField
              label="Số điện thoại"
              fullWidth
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                if (phoneError) setPhoneError('');
              }}
              error={Boolean(phoneError)}
              helperText={phoneError || ' '}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FormControl variant="standard">
                      <Select
                        value={country}
                        onChange={(event) => {
                          setCountry(event.target.value);
                          setRegion('');
                        }}
                        disableUnderline
                        sx={{ fontSize: 14 }}
                        displayEmpty
                        renderValue={(value) => {
                          if (!value) return 'Quốc gia';
                          const selected = countries.find((item) => item.value === value);
                          if (!selected) return 'Quốc gia';
                          const flag = getFlagEmoji(selected.value);
                          return `${flag} ${selected.code}`;
                        }}
                      >
                        <MenuItem value="">
                          <em>Quốc gia</em>
                        </MenuItem>
                        {countries.map((item) => (
                          <MenuItem key={item.value} value={item.value}>
                            {getFlagEmoji(item.value)} {item.label} ({item.code})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
            />

            <Autocomplete
              options={countries}
              value={selectedCountry}
              onChange={(_, newValue) => {
                setCountry(newValue?.value || '');
                setRegion('');
              }}
              getOptionLabel={(option) => option?.label || ''}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <li key={key} {...optionProps}>
                    {getFlagEmoji(option.value)} {option.label}
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Quốc gia đăng ký kinh doanh"
                  fullWidth
                />
              )}
            />

            <Autocomplete
              options={regionOptions}
              value={selectedRegion}
              onChange={(_, newValue) => setRegion(newValue?.value || '')}
              getOptionLabel={(option) => option?.label || ''}
              disabled={!country || (regionOptions.length === 0 && !regionLoading)}
              loading={regionLoading}
              noOptionsText={
                !country
                  ? 'Chọn quốc gia trước'
                  : country === 'vn'
                    ? 'Không tìm thấy tỉnh/thành'
                    : 'Chưa hỗ trợ danh sách khu vực'
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={!country ? 'Chọn quốc gia trước' : 'Chọn khu vực'}
                  fullWidth
                />
              )}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 2 }}>
              <Box
                sx={{
                  height: 40,
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  letterSpacing: 2,
                  bgcolor: '#f8fafc',
                  position: 'relative',
                }}
              >
                {captchaImage ? (
                  <img
                    src={captchaImage}
                    alt="captcha"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  '...'
                )}
                <IconButton
                  size="small"
                  onClick={refreshCaptcha}
                  sx={{ position: 'absolute', right: 4, top: 4 }}
                  aria-label="Làm mới mã xác thực"
                  disabled={captchaLoading}
                >
                  <RefreshIcon fontSize="inherit" />
                </IconButton>
              </Box>
              <TextField
                label="Nhập mã xác thực"
                value={captchaInput}
                onChange={(event) => {
                  setCaptchaInput(event.target.value.trim());
                  if (captchaError) setCaptchaError('');
                }}
                error={Boolean(captchaError)}
                helperText={captchaError || ' '}
                fullWidth
              />
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={agree}
                  onChange={(event) => setAgree(event.target.checked)}
                />
              }
              label="Tôi đã đọc và đồng ý Điều khoản và chính sách sử dụng"
            />

            <Button variant="contained" size="large" disabled={!agree} onClick={handleContinue}>
              Tiếp tục
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Button variant="text" onClick={() => navigate('/login')}>
              Đã có tài khoản? Đăng nhập
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
