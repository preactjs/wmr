import { mergeAllSourceMaps } from '../src/lib/sourcemaps/merge-sourcemap.js';
import { decodeMappings, decodeVLQ, encodeMappings, encodeVLQ } from '../src/lib/sourcemaps/vlq.js';

describe('Source Maps', () => {
	describe('encodeVLQ', () => {
		it('should encode numbers', () => {
			expect(encodeVLQ(0)).toEqual('A');
			expect(encodeVLQ(-1)).toEqual('D');
			expect(encodeVLQ(1)).toEqual('C');
			expect(encodeVLQ(67108863)).toEqual('+////D');
		});

		it('should encode all numbers', () => {
			const vlqs = [
				{ number: -255, encoded: '/P' },
				{ number: -254, encoded: '9P' },
				{ number: -253, encoded: '7P' },
				{ number: -252, encoded: '5P' },
				{ number: -251, encoded: '3P' },
				{ number: -250, encoded: '1P' },
				{ number: -249, encoded: 'zP' },
				{ number: -248, encoded: 'xP' },
				{ number: -247, encoded: 'vP' },
				{ number: -246, encoded: 'tP' },
				{ number: -245, encoded: 'rP' },
				{ number: -244, encoded: 'pP' },
				{ number: -243, encoded: 'nP' },
				{ number: -242, encoded: 'lP' },
				{ number: -241, encoded: 'jP' },
				{ number: -240, encoded: 'hP' },
				{ number: -239, encoded: '/O' },
				{ number: -238, encoded: '9O' },
				{ number: -237, encoded: '7O' },
				{ number: -236, encoded: '5O' },
				{ number: -235, encoded: '3O' },
				{ number: -234, encoded: '1O' },
				{ number: -233, encoded: 'zO' },
				{ number: -232, encoded: 'xO' },
				{ number: -231, encoded: 'vO' },
				{ number: -230, encoded: 'tO' },
				{ number: -229, encoded: 'rO' },
				{ number: -228, encoded: 'pO' },
				{ number: -227, encoded: 'nO' },
				{ number: -226, encoded: 'lO' },
				{ number: -225, encoded: 'jO' },
				{ number: -224, encoded: 'hO' },
				{ number: -223, encoded: '/N' },
				{ number: -222, encoded: '9N' },
				{ number: -221, encoded: '7N' },
				{ number: -220, encoded: '5N' },
				{ number: -219, encoded: '3N' },
				{ number: -218, encoded: '1N' },
				{ number: -217, encoded: 'zN' },
				{ number: -216, encoded: 'xN' },
				{ number: -215, encoded: 'vN' },
				{ number: -214, encoded: 'tN' },
				{ number: -213, encoded: 'rN' },
				{ number: -212, encoded: 'pN' },
				{ number: -211, encoded: 'nN' },
				{ number: -210, encoded: 'lN' },
				{ number: -209, encoded: 'jN' },
				{ number: -208, encoded: 'hN' },
				{ number: -207, encoded: '/M' },
				{ number: -206, encoded: '9M' },
				{ number: -205, encoded: '7M' },
				{ number: -204, encoded: '5M' },
				{ number: -203, encoded: '3M' },
				{ number: -202, encoded: '1M' },
				{ number: -201, encoded: 'zM' },
				{ number: -200, encoded: 'xM' },
				{ number: -199, encoded: 'vM' },
				{ number: -198, encoded: 'tM' },
				{ number: -197, encoded: 'rM' },
				{ number: -196, encoded: 'pM' },
				{ number: -195, encoded: 'nM' },
				{ number: -194, encoded: 'lM' },
				{ number: -193, encoded: 'jM' },
				{ number: -192, encoded: 'hM' },
				{ number: -191, encoded: '/L' },
				{ number: -190, encoded: '9L' },
				{ number: -189, encoded: '7L' },
				{ number: -188, encoded: '5L' },
				{ number: -187, encoded: '3L' },
				{ number: -186, encoded: '1L' },
				{ number: -185, encoded: 'zL' },
				{ number: -184, encoded: 'xL' },
				{ number: -183, encoded: 'vL' },
				{ number: -182, encoded: 'tL' },
				{ number: -181, encoded: 'rL' },
				{ number: -180, encoded: 'pL' },
				{ number: -179, encoded: 'nL' },
				{ number: -178, encoded: 'lL' },
				{ number: -177, encoded: 'jL' },
				{ number: -176, encoded: 'hL' },
				{ number: -175, encoded: '/K' },
				{ number: -174, encoded: '9K' },
				{ number: -173, encoded: '7K' },
				{ number: -172, encoded: '5K' },
				{ number: -171, encoded: '3K' },
				{ number: -170, encoded: '1K' },
				{ number: -169, encoded: 'zK' },
				{ number: -168, encoded: 'xK' },
				{ number: -167, encoded: 'vK' },
				{ number: -166, encoded: 'tK' },
				{ number: -165, encoded: 'rK' },
				{ number: -164, encoded: 'pK' },
				{ number: -163, encoded: 'nK' },
				{ number: -162, encoded: 'lK' },
				{ number: -161, encoded: 'jK' },
				{ number: -160, encoded: 'hK' },
				{ number: -159, encoded: '/J' },
				{ number: -158, encoded: '9J' },
				{ number: -157, encoded: '7J' },
				{ number: -156, encoded: '5J' },
				{ number: -155, encoded: '3J' },
				{ number: -154, encoded: '1J' },
				{ number: -153, encoded: 'zJ' },
				{ number: -152, encoded: 'xJ' },
				{ number: -151, encoded: 'vJ' },
				{ number: -150, encoded: 'tJ' },
				{ number: -149, encoded: 'rJ' },
				{ number: -148, encoded: 'pJ' },
				{ number: -147, encoded: 'nJ' },
				{ number: -146, encoded: 'lJ' },
				{ number: -145, encoded: 'jJ' },
				{ number: -144, encoded: 'hJ' },
				{ number: -143, encoded: '/I' },
				{ number: -142, encoded: '9I' },
				{ number: -141, encoded: '7I' },
				{ number: -140, encoded: '5I' },
				{ number: -139, encoded: '3I' },
				{ number: -138, encoded: '1I' },
				{ number: -137, encoded: 'zI' },
				{ number: -136, encoded: 'xI' },
				{ number: -135, encoded: 'vI' },
				{ number: -134, encoded: 'tI' },
				{ number: -133, encoded: 'rI' },
				{ number: -132, encoded: 'pI' },
				{ number: -131, encoded: 'nI' },
				{ number: -130, encoded: 'lI' },
				{ number: -129, encoded: 'jI' },
				{ number: -128, encoded: 'hI' },
				{ number: -127, encoded: '/H' },
				{ number: -126, encoded: '9H' },
				{ number: -125, encoded: '7H' },
				{ number: -124, encoded: '5H' },
				{ number: -123, encoded: '3H' },
				{ number: -122, encoded: '1H' },
				{ number: -121, encoded: 'zH' },
				{ number: -120, encoded: 'xH' },
				{ number: -119, encoded: 'vH' },
				{ number: -118, encoded: 'tH' },
				{ number: -117, encoded: 'rH' },
				{ number: -116, encoded: 'pH' },
				{ number: -115, encoded: 'nH' },
				{ number: -114, encoded: 'lH' },
				{ number: -113, encoded: 'jH' },
				{ number: -112, encoded: 'hH' },
				{ number: -111, encoded: '/G' },
				{ number: -110, encoded: '9G' },
				{ number: -109, encoded: '7G' },
				{ number: -108, encoded: '5G' },
				{ number: -107, encoded: '3G' },
				{ number: -106, encoded: '1G' },
				{ number: -105, encoded: 'zG' },
				{ number: -104, encoded: 'xG' },
				{ number: -103, encoded: 'vG' },
				{ number: -102, encoded: 'tG' },
				{ number: -101, encoded: 'rG' },
				{ number: -100, encoded: 'pG' },
				{ number: -99, encoded: 'nG' },
				{ number: -98, encoded: 'lG' },
				{ number: -97, encoded: 'jG' },
				{ number: -96, encoded: 'hG' },
				{ number: -95, encoded: '/F' },
				{ number: -94, encoded: '9F' },
				{ number: -93, encoded: '7F' },
				{ number: -92, encoded: '5F' },
				{ number: -91, encoded: '3F' },
				{ number: -90, encoded: '1F' },
				{ number: -89, encoded: 'zF' },
				{ number: -88, encoded: 'xF' },
				{ number: -87, encoded: 'vF' },
				{ number: -86, encoded: 'tF' },
				{ number: -85, encoded: 'rF' },
				{ number: -84, encoded: 'pF' },
				{ number: -83, encoded: 'nF' },
				{ number: -82, encoded: 'lF' },
				{ number: -81, encoded: 'jF' },
				{ number: -80, encoded: 'hF' },
				{ number: -79, encoded: '/E' },
				{ number: -78, encoded: '9E' },
				{ number: -77, encoded: '7E' },
				{ number: -76, encoded: '5E' },
				{ number: -75, encoded: '3E' },
				{ number: -74, encoded: '1E' },
				{ number: -73, encoded: 'zE' },
				{ number: -72, encoded: 'xE' },
				{ number: -71, encoded: 'vE' },
				{ number: -70, encoded: 'tE' },
				{ number: -69, encoded: 'rE' },
				{ number: -68, encoded: 'pE' },
				{ number: -67, encoded: 'nE' },
				{ number: -66, encoded: 'lE' },
				{ number: -65, encoded: 'jE' },
				{ number: -64, encoded: 'hE' },
				{ number: -63, encoded: '/D' },
				{ number: -62, encoded: '9D' },
				{ number: -61, encoded: '7D' },
				{ number: -60, encoded: '5D' },
				{ number: -59, encoded: '3D' },
				{ number: -58, encoded: '1D' },
				{ number: -57, encoded: 'zD' },
				{ number: -56, encoded: 'xD' },
				{ number: -55, encoded: 'vD' },
				{ number: -54, encoded: 'tD' },
				{ number: -53, encoded: 'rD' },
				{ number: -52, encoded: 'pD' },
				{ number: -51, encoded: 'nD' },
				{ number: -50, encoded: 'lD' },
				{ number: -49, encoded: 'jD' },
				{ number: -48, encoded: 'hD' },
				{ number: -47, encoded: '/C' },
				{ number: -46, encoded: '9C' },
				{ number: -45, encoded: '7C' },
				{ number: -44, encoded: '5C' },
				{ number: -43, encoded: '3C' },
				{ number: -42, encoded: '1C' },
				{ number: -41, encoded: 'zC' },
				{ number: -40, encoded: 'xC' },
				{ number: -39, encoded: 'vC' },
				{ number: -38, encoded: 'tC' },
				{ number: -37, encoded: 'rC' },
				{ number: -36, encoded: 'pC' },
				{ number: -35, encoded: 'nC' },
				{ number: -34, encoded: 'lC' },
				{ number: -33, encoded: 'jC' },
				{ number: -32, encoded: 'hC' },
				{ number: -31, encoded: '/B' },
				{ number: -30, encoded: '9B' },
				{ number: -29, encoded: '7B' },
				{ number: -28, encoded: '5B' },
				{ number: -27, encoded: '3B' },
				{ number: -26, encoded: '1B' },
				{ number: -25, encoded: 'zB' },
				{ number: -24, encoded: 'xB' },
				{ number: -23, encoded: 'vB' },
				{ number: -22, encoded: 'tB' },
				{ number: -21, encoded: 'rB' },
				{ number: -20, encoded: 'pB' },
				{ number: -19, encoded: 'nB' },
				{ number: -18, encoded: 'lB' },
				{ number: -17, encoded: 'jB' },
				{ number: -16, encoded: 'hB' },
				{ number: -15, encoded: 'f' },
				{ number: -14, encoded: 'd' },
				{ number: -13, encoded: 'b' },
				{ number: -12, encoded: 'Z' },
				{ number: -11, encoded: 'X' },
				{ number: -10, encoded: 'V' },
				{ number: -9, encoded: 'T' },
				{ number: -8, encoded: 'R' },
				{ number: -7, encoded: 'P' },
				{ number: -6, encoded: 'N' },
				{ number: -5, encoded: 'L' },
				{ number: -4, encoded: 'J' },
				{ number: -3, encoded: 'H' },
				{ number: -2, encoded: 'F' },
				{ number: -1, encoded: 'D' },
				{ number: 0, encoded: 'A' },
				{ number: 1, encoded: 'C' },
				{ number: 2, encoded: 'E' },
				{ number: 3, encoded: 'G' },
				{ number: 4, encoded: 'I' },
				{ number: 5, encoded: 'K' },
				{ number: 6, encoded: 'M' },
				{ number: 7, encoded: 'O' },
				{ number: 8, encoded: 'Q' },
				{ number: 9, encoded: 'S' },
				{ number: 10, encoded: 'U' },
				{ number: 11, encoded: 'W' },
				{ number: 12, encoded: 'Y' },
				{ number: 13, encoded: 'a' },
				{ number: 14, encoded: 'c' },
				{ number: 15, encoded: 'e' },
				{ number: 16, encoded: 'gB' },
				{ number: 17, encoded: 'iB' },
				{ number: 18, encoded: 'kB' },
				{ number: 19, encoded: 'mB' },
				{ number: 20, encoded: 'oB' },
				{ number: 21, encoded: 'qB' },
				{ number: 22, encoded: 'sB' },
				{ number: 23, encoded: 'uB' },
				{ number: 24, encoded: 'wB' },
				{ number: 25, encoded: 'yB' },
				{ number: 26, encoded: '0B' },
				{ number: 27, encoded: '2B' },
				{ number: 28, encoded: '4B' },
				{ number: 29, encoded: '6B' },
				{ number: 30, encoded: '8B' },
				{ number: 31, encoded: '+B' },
				{ number: 32, encoded: 'gC' },
				{ number: 33, encoded: 'iC' },
				{ number: 34, encoded: 'kC' },
				{ number: 35, encoded: 'mC' },
				{ number: 36, encoded: 'oC' },
				{ number: 37, encoded: 'qC' },
				{ number: 38, encoded: 'sC' },
				{ number: 39, encoded: 'uC' },
				{ number: 40, encoded: 'wC' },
				{ number: 41, encoded: 'yC' },
				{ number: 42, encoded: '0C' },
				{ number: 43, encoded: '2C' },
				{ number: 44, encoded: '4C' },
				{ number: 45, encoded: '6C' },
				{ number: 46, encoded: '8C' },
				{ number: 47, encoded: '+C' },
				{ number: 48, encoded: 'gD' },
				{ number: 49, encoded: 'iD' },
				{ number: 50, encoded: 'kD' },
				{ number: 51, encoded: 'mD' },
				{ number: 52, encoded: 'oD' },
				{ number: 53, encoded: 'qD' },
				{ number: 54, encoded: 'sD' },
				{ number: 55, encoded: 'uD' },
				{ number: 56, encoded: 'wD' },
				{ number: 57, encoded: 'yD' },
				{ number: 58, encoded: '0D' },
				{ number: 59, encoded: '2D' },
				{ number: 60, encoded: '4D' },
				{ number: 61, encoded: '6D' },
				{ number: 62, encoded: '8D' },
				{ number: 63, encoded: '+D' },
				{ number: 64, encoded: 'gE' },
				{ number: 65, encoded: 'iE' },
				{ number: 66, encoded: 'kE' },
				{ number: 67, encoded: 'mE' },
				{ number: 68, encoded: 'oE' },
				{ number: 69, encoded: 'qE' },
				{ number: 70, encoded: 'sE' },
				{ number: 71, encoded: 'uE' },
				{ number: 72, encoded: 'wE' },
				{ number: 73, encoded: 'yE' },
				{ number: 74, encoded: '0E' },
				{ number: 75, encoded: '2E' },
				{ number: 76, encoded: '4E' },
				{ number: 77, encoded: '6E' },
				{ number: 78, encoded: '8E' },
				{ number: 79, encoded: '+E' },
				{ number: 80, encoded: 'gF' },
				{ number: 81, encoded: 'iF' },
				{ number: 82, encoded: 'kF' },
				{ number: 83, encoded: 'mF' },
				{ number: 84, encoded: 'oF' },
				{ number: 85, encoded: 'qF' },
				{ number: 86, encoded: 'sF' },
				{ number: 87, encoded: 'uF' },
				{ number: 88, encoded: 'wF' },
				{ number: 89, encoded: 'yF' },
				{ number: 90, encoded: '0F' },
				{ number: 91, encoded: '2F' },
				{ number: 92, encoded: '4F' },
				{ number: 93, encoded: '6F' },
				{ number: 94, encoded: '8F' },
				{ number: 95, encoded: '+F' },
				{ number: 96, encoded: 'gG' },
				{ number: 97, encoded: 'iG' },
				{ number: 98, encoded: 'kG' },
				{ number: 99, encoded: 'mG' },
				{ number: 100, encoded: 'oG' },
				{ number: 101, encoded: 'qG' },
				{ number: 102, encoded: 'sG' },
				{ number: 103, encoded: 'uG' },
				{ number: 104, encoded: 'wG' },
				{ number: 105, encoded: 'yG' },
				{ number: 106, encoded: '0G' },
				{ number: 107, encoded: '2G' },
				{ number: 108, encoded: '4G' },
				{ number: 109, encoded: '6G' },
				{ number: 110, encoded: '8G' },
				{ number: 111, encoded: '+G' },
				{ number: 112, encoded: 'gH' },
				{ number: 113, encoded: 'iH' },
				{ number: 114, encoded: 'kH' },
				{ number: 115, encoded: 'mH' },
				{ number: 116, encoded: 'oH' },
				{ number: 117, encoded: 'qH' },
				{ number: 118, encoded: 'sH' },
				{ number: 119, encoded: 'uH' },
				{ number: 120, encoded: 'wH' },
				{ number: 121, encoded: 'yH' },
				{ number: 122, encoded: '0H' },
				{ number: 123, encoded: '2H' },
				{ number: 124, encoded: '4H' },
				{ number: 125, encoded: '6H' },
				{ number: 126, encoded: '8H' },
				{ number: 127, encoded: '+H' },
				{ number: 128, encoded: 'gI' },
				{ number: 129, encoded: 'iI' },
				{ number: 130, encoded: 'kI' },
				{ number: 131, encoded: 'mI' },
				{ number: 132, encoded: 'oI' },
				{ number: 133, encoded: 'qI' },
				{ number: 134, encoded: 'sI' },
				{ number: 135, encoded: 'uI' },
				{ number: 136, encoded: 'wI' },
				{ number: 137, encoded: 'yI' },
				{ number: 138, encoded: '0I' },
				{ number: 139, encoded: '2I' },
				{ number: 140, encoded: '4I' },
				{ number: 141, encoded: '6I' },
				{ number: 142, encoded: '8I' },
				{ number: 143, encoded: '+I' },
				{ number: 144, encoded: 'gJ' },
				{ number: 145, encoded: 'iJ' },
				{ number: 146, encoded: 'kJ' },
				{ number: 147, encoded: 'mJ' },
				{ number: 148, encoded: 'oJ' },
				{ number: 149, encoded: 'qJ' },
				{ number: 150, encoded: 'sJ' },
				{ number: 151, encoded: 'uJ' },
				{ number: 152, encoded: 'wJ' },
				{ number: 157, encoded: '6J' },
				{ number: 158, encoded: '8J' },
				{ number: 159, encoded: '+J' },
				{ number: 160, encoded: 'gK' },
				{ number: 161, encoded: 'iK' },
				{ number: 162, encoded: 'kK' },
				{ number: 163, encoded: 'mK' },
				{ number: 164, encoded: 'oK' },
				{ number: 165, encoded: 'qK' },
				{ number: 166, encoded: 'sK' },
				{ number: 167, encoded: 'uK' },
				{ number: 168, encoded: 'wK' },
				{ number: 169, encoded: 'yK' },
				{ number: 170, encoded: '0K' },
				{ number: 171, encoded: '2K' },
				{ number: 172, encoded: '4K' },
				{ number: 173, encoded: '6K' },
				{ number: 174, encoded: '8K' },
				{ number: 175, encoded: '+K' },
				{ number: 176, encoded: 'gL' },
				{ number: 177, encoded: 'iL' },
				{ number: 178, encoded: 'kL' },
				{ number: 179, encoded: 'mL' },
				{ number: 180, encoded: 'oL' },
				{ number: 181, encoded: 'qL' },
				{ number: 182, encoded: 'sL' },
				{ number: 183, encoded: 'uL' },
				{ number: 184, encoded: 'wL' },
				{ number: 185, encoded: 'yL' },
				{ number: 186, encoded: '0L' },
				{ number: 187, encoded: '2L' },
				{ number: 188, encoded: '4L' },
				{ number: 189, encoded: '6L' },
				{ number: 190, encoded: '8L' },
				{ number: 191, encoded: '+L' },
				{ number: 192, encoded: 'gM' },
				{ number: 193, encoded: 'iM' },
				{ number: 194, encoded: 'kM' },
				{ number: 195, encoded: 'mM' },
				{ number: 196, encoded: 'oM' },
				{ number: 197, encoded: 'qM' },
				{ number: 198, encoded: 'sM' },
				{ number: 199, encoded: 'uM' },
				{ number: 200, encoded: 'wM' },
				{ number: 201, encoded: 'yM' },
				{ number: 202, encoded: '0M' },
				{ number: 203, encoded: '2M' },
				{ number: 204, encoded: '4M' },
				{ number: 205, encoded: '6M' },
				{ number: 206, encoded: '8M' },
				{ number: 207, encoded: '+M' },
				{ number: 208, encoded: 'gN' },
				{ number: 209, encoded: 'iN' },
				{ number: 210, encoded: 'kN' },
				{ number: 211, encoded: 'mN' },
				{ number: 212, encoded: 'oN' },
				{ number: 213, encoded: 'qN' },
				{ number: 214, encoded: 'sN' },
				{ number: 215, encoded: 'uN' },
				{ number: 216, encoded: 'wN' },
				{ number: 217, encoded: 'yN' },
				{ number: 218, encoded: '0N' },
				{ number: 219, encoded: '2N' },
				{ number: 220, encoded: '4N' },
				{ number: 221, encoded: '6N' },
				{ number: 222, encoded: '8N' },
				{ number: 223, encoded: '+N' },
				{ number: 224, encoded: 'gO' },
				{ number: 225, encoded: 'iO' },
				{ number: 226, encoded: 'kO' },
				{ number: 227, encoded: 'mO' },
				{ number: 228, encoded: 'oO' },
				{ number: 229, encoded: 'qO' },
				{ number: 230, encoded: 'sO' },
				{ number: 231, encoded: 'uO' },
				{ number: 232, encoded: 'wO' },
				{ number: 233, encoded: 'yO' },
				{ number: 234, encoded: '0O' },
				{ number: 235, encoded: '2O' },
				{ number: 236, encoded: '4O' },
				{ number: 237, encoded: '6O' },
				{ number: 238, encoded: '8O' },
				{ number: 239, encoded: '+O' },
				{ number: 240, encoded: 'gP' },
				{ number: 241, encoded: 'iP' },
				{ number: 242, encoded: 'kP' },
				{ number: 243, encoded: 'mP' },
				{ number: 244, encoded: 'oP' },
				{ number: 245, encoded: 'qP' },
				{ number: 246, encoded: 'sP' },
				{ number: 247, encoded: 'uP' },
				{ number: 248, encoded: 'wP' },
				{ number: 249, encoded: 'yP' },
				{ number: 250, encoded: '0P' },
				{ number: 251, encoded: '2P' },
				{ number: 252, encoded: '4P' },
				{ number: 253, encoded: '6P' },
				{ number: 254, encoded: '8P' },
				{ number: 255, encoded: '+P' }
			];

			vlqs.forEach(vlq => {
				expect(encodeVLQ(vlq.number)).toEqual(vlq.encoded);
			});
		});
	});

	describe('encodeMappings', () => {
		/**
		 * @param {number[]} mappings
		 * @returns {number[][]}
		 */
		function splitMappings(mappings) {
			const out = [];

			for (let i = 0; i < mappings.length; i += 6) {
				out.push(mappings.slice(i, i + 6));
			}

			return out;
		}

		/** @type {(mappings: number[]) => number[][]} */
		const testEncodeDecode = mappings => {
			return splitMappings(decodeMappings(encodeMappings(mappings), 1));
		};

		it('should encode mappings', () => {
			expect(encodeMappings([0, 6, 1, 4, 6, -1])).toEqual('MCJN');
			expect(
				encodeMappings(
					[
						[0, 6, 1, 4, 6, -1],
						[1, 0, 1, 4, 8, -1]
					].flat()
				)
			).toEqual('MCJN;ACRd');
		});

		it('should encode and decode mappings', () => {
			const mappings = [
				[0, 0, 0, 4, 0, -1],
				[0, 7, 0, 4, 7, -1],
				[0, 15, 0, 4, 15, -1],
				[0, 16, 0, 4, 16, -1],
				[0, 18, 0, 4, 18, -1],
				[0, 19, 0, 4, 19, -1],
				[0, 20, 0, 4, 20, -1],
				[0, 23, 0, 4, 28, -1],
				[1, 2, 0, 5, 2, -1],
				[1, 9, 0, 5, 9, -1],
				[1, 12, 0, 5, 12, -1],
				[1, 13, 0, 5, 13, -1],
				[1, 16, 0, 5, 16, -1],
				[1, 17, 0, 5, 17, -1],
				[2, 0, 0, 6, 0, -1]
			];

			expect(testEncodeDecode(mappings.flat())).toEqual(mappings);
		});
	});

	describe('decodeVLQ', () => {
		it('should decode VLQ', () => {
			const result = { i: 0 };
			expect(decodeVLQ('A', result)).toEqual(0);
			expect(result).toEqual({ i: 1 });

			result.i = 0;
			expect(decodeVLQ('D', result)).toEqual(-1);
			expect(result).toEqual({ i: 1 });

			result.i = 0;
			expect(decodeVLQ('C', result)).toEqual(1);
			expect(result).toEqual({ i: 1 });

			result.i = 0;
			expect(decodeVLQ('+////D', result)).toEqual(67108863);
			expect(result).toEqual({ i: 6 });
		});

		it('should throw on invalid characters', () => {
			const result = { i: 0 };
			expect(() => decodeVLQ('ÄÖ', result)).toThrow(/invalid character/i);
		});
	});

	describe('decodeMappings', () => {
		/**
		 * @param {number[]} mappings
		 */
		function toMappingObj(mappings) {
			const out = [];
			for (let i = 0; i < mappings.length; i += 6) {
				out.push({
					line: mappings[i],
					column: mappings[i + 1],
					sourceIdx: mappings[i + 2],
					sourceLine: mappings[i + 3],
					sourceColumn: mappings[i + 4],
					sourceName: mappings[i + 5]
				});
			}
			return out;
		}

		it('should decode example mappings', () => {
			/**
			 * INPUT:
			 * ```ts
			 * export interface Foo {
			 *   foo: number;
			 * }
			 *
			 * export function foo(foo: Foo) {
			 *   return foo.foo;
			 * }
			 * ```
			 *
			 * OUTPUT:
			 * ```js
			 * "use strict";
			 * exports.__esModule = true;
			 * exports.foo = void 0;
			 * function foo(foo) {
			 *    return foo.foo;
			 * }
			 * exports.foo = foo;
			 * //# sourceMappingURL=index.js.map
			 * ```
			 */
			const mappings = ';;;AAIA,SAAgB,GAAG,CAAC,GAAQ;IAC1B,OAAO,GAAG,CAAC,GAAG,CAAC;AACjB,CAAC;AAFD,kBAEC';

			expect(toMappingObj(decodeMappings(mappings, 1))).toEqual([
				// `function `
				{ line: 3, column: 0, sourceIdx: 0, sourceLine: 4, sourceColumn: 0, sourceName: -1 },
				// `foo`
				{ line: 3, column: 9, sourceIdx: 0, sourceLine: 4, sourceColumn: 16, sourceName: -1 },
				// `(`
				{ line: 3, column: 12, sourceIdx: 0, sourceLine: 4, sourceColumn: 19, sourceName: -1 },
				// `foo`
				{ line: 3, column: 13, sourceIdx: 0, sourceLine: 4, sourceColumn: 20, sourceName: -1 },
				// `) {`
				{ line: 3, column: 16, sourceIdx: 0, sourceLine: 4, sourceColumn: 28, sourceName: -1 },
				// `return `
				{ line: 4, column: 4, sourceIdx: 0, sourceLine: 5, sourceColumn: 2, sourceName: -1 },
				// `foo`
				{ line: 4, column: 11, sourceIdx: 0, sourceLine: 5, sourceColumn: 9, sourceName: -1 },
				// `.`
				{ line: 4, column: 14, sourceIdx: 0, sourceLine: 5, sourceColumn: 12, sourceName: -1 },
				// `foo`
				{ line: 4, column: 15, sourceIdx: 0, sourceLine: 5, sourceColumn: 13, sourceName: -1 },
				// `;`
				{ line: 4, column: 18, sourceIdx: 0, sourceLine: 5, sourceColumn: 16, sourceName: -1 },
				// ``
				{ line: 4, column: 19, sourceIdx: 0, sourceLine: 5, sourceColumn: 17, sourceName: -1 },
				// `}`
				{ line: 5, column: 0, sourceIdx: 0, sourceLine: 6, sourceColumn: 0, sourceName: -1 },
				// ``
				{ line: 5, column: 1, sourceIdx: 0, sourceLine: 6, sourceColumn: 1, sourceName: -1 },
				// `exports.foo = foo;`
				{ line: 6, column: 0, sourceIdx: 0, sourceLine: 4, sourceColumn: 0, sourceName: -1 },
				// ``
				{ line: 6, column: 18, sourceIdx: 0, sourceLine: 6, sourceColumn: 1, sourceName: -1 }
			]);
		});
	});

	describe('mergeAllSourceMaps', () => {
		it('should merge source maps', () => {
			/** @type {import("rollup").ExistingRawSourceMap} */
			const step1 = {
				version: 3,
				file: 'foo.js',
				mappings: encodeMappings(
					[
						[0, 0, 0, 4, 0, -1],
						[0, 7, 0, 4, 7, -1],
						[0, 15, 0, 4, 15, -1],
						[0, 16, 0, 4, 16, -1],
						[0, 18, 0, 4, 18, -1],
						[0, 19, 0, 4, 19, -1],
						[0, 20, 0, 4, 20, -1],
						[0, 23, 0, 4, 28, -1],
						[1, 2, 0, 5, 2, -1],
						[1, 9, 0, 5, 9, -1],
						[1, 12, 0, 5, 12, -1],
						[1, 13, 0, 5, 13, -1],
						[1, 16, 0, 5, 16, -1],
						[1, 17, 0, 5, 17, -1],
						[2, 0, 0, 6, 0, -1]
					].flat()
				),
				names: [],
				sources: ['foo.js'],
				sourcesContent: [
					[
						'export interface Foo {',
						'  foo: number;',
						'}',
						'',
						'export function foo(foo: Foo) {',
						'  return foo.foo;',
						'}'
					].join('\n')
				]
			};

			/** @type {import("rollup").ExistingRawSourceMap} */
			const step2 = {
				version: 3,
				file: 'foo.js',
				mappings: '',
				names: [],
				sources: ['foo.js'],
				sourcesContent: [
					// prettier-ignore
					[
            "export function foo(foo) {",
            "  return foo.foo;",
            "}"
          ].join("\n")
				]
			};

			/** @type {import("rollup").ExistingRawSourceMap} */
			const step3 = {
				version: 3,
				file: 'foo.js',
				mappings: '',
				names: [],
				sources: ['foo.js'],
				sourcesContent: [
					// prettier-ignore
					[
            '"use strict";',
            "exports.__esModule = true;",
            "exports.foo = void 0;",
            "",
            " function foo(foo) {",
            "  return foo.foo;",
            "}",
            "exports.foo = foo"
          ].join("\n")
				]
			};

			expect(mergeAllSourceMaps([step1, step2, step3])).toEqual({
				version: 3,
				file: 'foo.js',
				names: [],
				sources: ['foo.js'],
				sourceRoot: undefined,
				mappings: '',
				sourcesContent: [
					[
						'export interface Foo {',
						'  foo: number;',
						'}',
						'',
						'export function foo(foo: Foo) {',
						'  return foo.foo;',
						'}'
					].join('\n')
				]
			});
			//
		});
	});
});
