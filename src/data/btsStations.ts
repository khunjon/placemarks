// BTS and MRT station data for Bangkok
export interface TransitStation {
  id: string;
  name: string;
  nameEn: string;
  nameTh: string;
  coordinates: [number, number]; // [longitude, latitude]
  line: string;
  lineColor: string;
  type: 'BTS' | 'MRT' | 'ARL'; // Airport Rail Link
  zone?: number;
  interchanges?: string[]; // Other lines at this station
}

// BTS Sukhumvit Line (Light Green)
export const BTS_SUKHUMVIT_STATIONS: TransitStation[] = [
  {
    id: 'bts_mo_chit',
    name: 'Mo Chit',
    nameEn: 'Mo Chit',
    nameTh: 'หมอชิต',
    coordinates: [100.5538, 13.8021],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1,
    interchanges: ['MRT Blue Line']
  },
  {
    id: 'bts_saphan_phut',
    name: 'Saphan Phut',
    nameEn: 'Saphan Phut',
    nameTh: 'สะพานพุทธ',
    coordinates: [100.5538, 13.7956],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_sena_nikhom',
    name: 'Sena Nikhom',
    nameEn: 'Sena Nikhom',
    nameTh: 'เสนานิคม',
    coordinates: [100.5538, 13.7891],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_ari',
    name: 'Ari',
    nameEn: 'Ari',
    nameTh: 'อารีย์',
    coordinates: [100.5538, 13.7796],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_sanam_pao',
    name: 'Sanam Pao',
    nameEn: 'Sanam Pao',
    nameTh: 'สนามเป้า',
    coordinates: [100.5538, 13.7701],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_victory_monument',
    name: 'Victory Monument',
    nameEn: 'Victory Monument',
    nameTh: 'อนุสาวรีย์ชัยสมรภูมิ',
    coordinates: [100.5375, 13.7658],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_phaya_thai',
    name: 'Phaya Thai',
    nameEn: 'Phaya Thai',
    nameTh: 'พญาไท',
    coordinates: [100.5329, 13.7564],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1,
    interchanges: ['ARL']
  },
  {
    id: 'bts_ratchathewi',
    name: 'Ratchathewi',
    nameEn: 'Ratchathewi',
    nameTh: 'ราชเทวี',
    coordinates: [100.5329, 13.7518],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_siam',
    name: 'Siam',
    nameEn: 'Siam',
    nameTh: 'สยาม',
    coordinates: [100.5332, 13.7456],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1,
    interchanges: ['Silom Line']
  },
  {
    id: 'bts_chit_lom',
    name: 'Chit Lom',
    nameEn: 'Chit Lom',
    nameTh: 'ชิดลม',
    coordinates: [100.5434, 13.7440],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_phloen_chit',
    name: 'Phloen Chit',
    nameEn: 'Phloen Chit',
    nameTh: 'เพลินจิต',
    coordinates: [100.5489, 13.7418],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_nana',
    name: 'Nana',
    nameEn: 'Nana',
    nameTh: 'นานา',
    coordinates: [100.5544, 13.7396],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_asok',
    name: 'Asok',
    nameEn: 'Asok',
    nameTh: 'อโศก',
    coordinates: [100.5601, 13.7374],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1,
    interchanges: ['MRT Blue Line']
  },
  {
    id: 'bts_phrom_phong',
    name: 'Phrom Phong',
    nameEn: 'Phrom Phong',
    nameTh: 'พร้อมพงษ์',
    coordinates: [100.5697, 13.7308],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_thong_lo',
    name: 'Thong Lo',
    nameEn: 'Thong Lo',
    nameTh: 'ทองหล่อ',
    coordinates: [100.5793, 13.7242],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_ekkamai',
    name: 'Ekkamai',
    nameEn: 'Ekkamai',
    nameTh: 'เอกมัย',
    coordinates: [100.5889, 13.7176],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_phra_khanong',
    name: 'Phra Khanong',
    nameEn: 'Phra Khanong',
    nameTh: 'พระโขนง',
    coordinates: [100.5985, 13.7110],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_on_nut',
    name: 'On Nut',
    nameEn: 'On Nut',
    nameTh: 'อ่อนนุช',
    coordinates: [100.6081, 13.7044],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 2
  },
  {
    id: 'bts_bang_chak',
    name: 'Bang Chak',
    nameEn: 'Bang Chak',
    nameTh: 'บางจาก',
    coordinates: [100.6177, 13.6978],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 2
  },
  {
    id: 'bts_punnawithi',
    name: 'Punnawithi',
    nameEn: 'Punnawithi',
    nameTh: 'ปุณณวิถี',
    coordinates: [100.6273, 13.6912],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 2
  },
  {
    id: 'bts_udom_suk',
    name: 'Udom Suk',
    nameEn: 'Udom Suk',
    nameTh: 'อุดมสุข',
    coordinates: [100.6369, 13.6846],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 2
  },
  {
    id: 'bts_bang_na',
    name: 'Bang Na',
    nameEn: 'Bang Na',
    nameTh: 'บางนา',
    coordinates: [100.6465, 13.6780],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 2
  },
  {
    id: 'bts_bearing',
    name: 'Bearing',
    nameEn: 'Bearing',
    nameTh: 'แบริ่ง',
    coordinates: [100.6561, 13.6714],
    line: 'Sukhumvit',
    lineColor: '#9ACD32',
    type: 'BTS',
    zone: 2
  }
];

// BTS Silom Line (Dark Green)
export const BTS_SILOM_STATIONS: TransitStation[] = [
  {
    id: 'bts_national_stadium',
    name: 'National Stadium',
    nameEn: 'National Stadium',
    nameTh: 'สนามกีฬาแห่งชาติ',
    coordinates: [100.5292, 13.7456],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_siam_silom',
    name: 'Siam',
    nameEn: 'Siam',
    nameTh: 'สยาม',
    coordinates: [100.5332, 13.7456],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1,
    interchanges: ['Sukhumvit Line']
  },
  {
    id: 'bts_ratchadamri',
    name: 'Ratchadamri',
    nameEn: 'Ratchadamri',
    nameTh: 'ราชดำริ',
    coordinates: [100.5332, 13.7396],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_sala_daeng',
    name: 'Sala Daeng',
    nameEn: 'Sala Daeng',
    nameTh: 'ศาลาแดง',
    coordinates: [100.5332, 13.7286],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1,
    interchanges: ['MRT Blue Line']
  },
  {
    id: 'bts_chong_nonsi',
    name: 'Chong Nonsi',
    nameEn: 'Chong Nonsi',
    nameTh: 'ช่องนนทรี',
    coordinates: [100.5332, 13.7220],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_surasak',
    name: 'Surasak',
    nameEn: 'Surasak',
    nameTh: 'สุรศักดิ์',
    coordinates: [100.5332, 13.7154],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_saphan_taksin',
    name: 'Saphan Taksin',
    nameEn: 'Saphan Taksin',
    nameTh: 'สะพานตากสิน',
    coordinates: [100.5154, 13.7088],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1,
    interchanges: ['Chao Phraya Express Boat']
  },
  {
    id: 'bts_krung_thon_buri',
    name: 'Krung Thon Buri',
    nameEn: 'Krung Thon Buri',
    nameTh: 'กรุงธนบุรี',
    coordinates: [100.5088, 13.7022],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_wongwian_yai',
    name: 'Wongwian Yai',
    nameEn: 'Wongwian Yai',
    nameTh: 'วงเวียนใหญ่',
    coordinates: [100.5022, 13.6956],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_pho_nimit',
    name: 'Pho Nimit',
    nameEn: 'Pho Nimit',
    nameTh: 'โพธิ์นิมิตร',
    coordinates: [100.4956, 13.6890],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_talad_phlu',
    name: 'Talad Phlu',
    nameEn: 'Talad Phlu',
    nameTh: 'ตลาดพลู',
    coordinates: [100.4890, 13.6824],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 1
  },
  {
    id: 'bts_wutthakat',
    name: 'Wutthakat',
    nameEn: 'Wutthakat',
    nameTh: 'วุฒากาศ',
    coordinates: [100.4824, 13.6758],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 2
  },
  {
    id: 'bts_bang_wa',
    name: 'Bang Wa',
    nameEn: 'Bang Wa',
    nameTh: 'บางหว้า',
    coordinates: [100.4758, 13.6692],
    line: 'Silom',
    lineColor: '#006400',
    type: 'BTS',
    zone: 2
  }
];

// Key MRT Blue Line Stations
export const MRT_BLUE_STATIONS: TransitStation[] = [
  {
    id: 'mrt_chatuchak_park',
    name: 'Chatuchak Park',
    nameEn: 'Chatuchak Park',
    nameTh: 'สวนจตุจักร',
    coordinates: [100.5538, 13.8021],
    line: 'Blue',
    lineColor: '#0066CC',
    type: 'MRT',
    interchanges: ['BTS Sukhumvit']
  },
  {
    id: 'mrt_sukhumvit',
    name: 'Sukhumvit',
    nameEn: 'Sukhumvit',
    nameTh: 'สุขุมวิท',
    coordinates: [100.5601, 13.7374],
    line: 'Blue',
    lineColor: '#0066CC',
    type: 'MRT',
    interchanges: ['BTS Sukhumvit']
  },
  {
    id: 'mrt_silom',
    name: 'Silom',
    nameEn: 'Silom',
    nameTh: 'สีลม',
    coordinates: [100.5332, 13.7286],
    line: 'Blue',
    lineColor: '#0066CC',
    type: 'MRT',
    interchanges: ['BTS Silom']
  },
  {
    id: 'mrt_lumphini',
    name: 'Lumphini',
    nameEn: 'Lumphini',
    nameTh: 'ลุมพินี',
    coordinates: [100.5376, 13.7220],
    line: 'Blue',
    lineColor: '#0066CC',
    type: 'MRT'
  },
  {
    id: 'mrt_khlong_toei',
    name: 'Khlong Toei',
    nameEn: 'Khlong Toei',
    nameTh: 'คลองเตย',
    coordinates: [100.5420, 13.7154],
    line: 'Blue',
    lineColor: '#0066CC',
    type: 'MRT'
  },
  {
    id: 'mrt_queen_sirikit',
    name: 'Queen Sirikit National Convention Centre',
    nameEn: 'Queen Sirikit National Convention Centre',
    nameTh: 'ศูนย์การประชุมแห่งชาติสิริกิติ์',
    coordinates: [100.5464, 13.7088],
    line: 'Blue',
    lineColor: '#0066CC',
    type: 'MRT'
  }
];

// All stations combined
export const ALL_TRANSIT_STATIONS: TransitStation[] = [
  ...BTS_SUKHUMVIT_STATIONS,
  ...BTS_SILOM_STATIONS,
  ...MRT_BLUE_STATIONS
];

// Helper functions
export const getStationsByLine = (line: string): TransitStation[] => {
  return ALL_TRANSIT_STATIONS.filter(station => station.line === line);
};

export const getStationsByType = (type: 'BTS' | 'MRT' | 'ARL'): TransitStation[] => {
  return ALL_TRANSIT_STATIONS.filter(station => station.type === type);
};

export const findNearestStation = (
  latitude: number, 
  longitude: number, 
  maxDistance: number = 2000 // meters
): TransitStation | null => {
  let nearestStation: TransitStation | null = null;
  let minDistance = Infinity;

  for (const station of ALL_TRANSIT_STATIONS) {
    const distance = calculateDistance(
      latitude, longitude,
      station.coordinates[1], station.coordinates[0]
    );
    
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      nearestStation = station;
    }
  }

  return nearestStation;
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}; 