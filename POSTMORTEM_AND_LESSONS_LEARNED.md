# Postmortem & Lessons Learned

Tài liệu ghi nhận toàn bộ lỗi đã phát hiện, nguyên nhân gốc rễ và giải pháp phòng ngừa trong quá trình rà soát và nâng cấp **Job Portal**.

---

## Chu kỳ 1 — Vòng 1 & Vòng 2 (Backend Security, Validation, Search & Business Logic)

### 1. Hardcoded JWT secret fallback trong `backend/src/utils/jwt.ts`
1. **Triệu chứng lỗi:** `getAccessSecret()` và `getRefreshSecret()` rơi về chuỗi `"dev_access_secret_change_me"` / `"dev_refresh_secret_change_me"` nếu đọc từ `process.env` không có giá trị.
2. **Nguyên nhân gốc rễ:** Đọc trực tiếp `process.env` kèm fallback cứng thay vì dùng biến môi trường đã qua Zod validate trong `env.ts`.
3. **Giải pháp & quy tắc phòng ngừa:** Dùng trực tiếp `env.JWT_ACCESS_SECRET`, `env.JWT_REFRESH_SECRET`, `env.JWT_ACCESS_EXPIRES`, `env.JWT_REFRESH_EXPIRES` từ `backend/src/utils/env.ts`. Cấm tuyệt đối chuỗi fallback bí mật trong source code.

### 2. Rò rỉ nhánh đăng nhập/refresh của tài khoản bị vô hiệu hóa & lỗi Google OAuth thiếu email
1. **Triệu chứng lỗi:**
   - User bị admin khóa (`isActive: false`) vẫn có thể đăng nhập qua Google OAuth callback; hoặc endpoint `/api/auth/refresh` khi gặp tài khoản bị khóa/token lỗi không xóa cookie cũ.
   - Tài khoản Google không có email bị tạo thành bản ghi `email: ""` trong MongoDB.
   - `register`/`login` không chuẩn hóa `email` (`.trim().toLowerCase()`) và trả raw `ZodError` object thay vì format phẳng nhất quán.
2. **Nguyên nhân gốc rễ:** Thiếu kiểm tra `isActive` tại `googleCallback`, thiếu `clearAuthCookies(res)` trong các nhánh lỗi của `refresh`, thiếu kiểm tra `email` rỗng trong `passport.ts`, và không chuẩn hóa email nhất quán.
3. **Giải pháp & quy tắc phòng ngừa:** Bổ sung `normalizeEmail()` trong `backend/src/utils/validation.ts`, kiểm tra `isActive` tại `googleCallback`, xóa cookie trong nhánh thất bại của `refresh`, trả `error.flatten()` cho `ZodError`, và từ chối Google OAuth nếu thiếu email.

### 3. Lỗ hổng bypass AI rate limit & thiếu bảo vệ brute-force Auth
1. **Triệu chứng lỗi:** Các endpoint `/api/applications/generate-cover-letter` và `/api/applications/:applicationId/summarize` không bị rate-limit (khác với `/api/ai/*`); các route `/api/auth/login` và `/api/auth/register` không có rate limit chống brute-force; `setInterval` trong `rateLimit.ts` giữ process test mở.
2. **Nguyên nhân gốc rễ:** Rate limiter trước đây viết đơn lẻ cho 1 route group (`/api/ai`), không tách theo `keyPrefix` và không dùng chung trên route tương đương ở `application.routes.ts`.
3. **Giải pháp & quy tắc phòng ngừa:** Tách `createRateLimiter({ windowMs, max, message, keyPrefix })` trong `backend/src/middlewares/rateLimit.ts` với `.unref()` cho timer dọn rác, gắn `aiRateLimit` vào cả `application.routes.ts` và gắn `authRateLimit` vào `login`/`register`.

### 4. Lỗi Regex tiếng Việt có dấu (`\b`), ký tự đặc biệt (`C++`) và crash 500 trên query/ObjectId
1. **Triệu chứng lỗi:**
   - Tìm kiếm `description` dùng `\\b${fuzzyQuery}\\b` không khớp với từ tiếng Việt có dấu ở đầu/cuối (ví dụ `"nghe"` không khớp `"công nghệ"`, `"ung dung"` không khớp `"ứng dụng"`).
   - Tìm kiếm `location`, `skills`, hoặc `admin` `search` với chuỗi chứa `+`, `(`, `.` (`C++`, `.NET`) ném `SyntaxError` / lỗi 500 vì không escape regex.
   - Truy vấn phân trang với `page=abc` / `salaryMin=abc` sinh `NaN` và ID sai định dạng gây lỗi `CastError` 500 thay vì `400`.
   - `errorHandler.ts` không bắt `MulterError` và kiểm tra sai chuỗi thông báo từ `upload.ts` (`"File type not allowed"` vs `"files are allowed"`).
2. **Nguyên nhân gốc rễ:** `\b` trong PCRE/JS chỉ coi `[a-zA-Z0-9_]` là ký tự từ; logic regex viết lặp cục bộ thiếu escape trước khi thay ký tự dấu; thiếu validation `isValidObjectId` và numeric parser an toàn.
3. **Giải pháp & quy tắc phòng ngừa:** Gom toàn bộ hàm vào `backend/src/utils/validation.ts` (`escapeRegex`, `buildDiacriticPattern`, `buildWordBoundaryRegexPattern` với `NON_WORD_CHAR`, `isValidObjectId`, `parseBoundedInt`, `parseNonNegativeNumber`), áp dụng đồng nhất ở tất cả controllers, cập nhật `errorHandler.ts` xử lý `MulterError` và `CastError`. Có unit test trong `backend/src/__tests__/validation.test.ts`.

### 5. Lỗi kiểm tra mức lương (Salary = 0 & partial update), Orphan Applications & RBAC Admin
1. **Triệu chứng lỗi:**
   - `createJobSchema` / `updateJobSchema` dùng truthy check (`data.salaryMin && data.salaryMax`) nên bỏ sót khi `salaryMax === 0`.
   - `updateJob` khi chỉ cập nhật `salaryMin` (hoặc `salaryMax`) không kiểm tra với giá trị `salaryMax` (hoặc `salaryMin`) đang lưu trong DB.
   - `deleteJob` xóa job nhưng để lại bản ghi `Application` mồ côi (`job: null`), đồng thời Admin bị chặn bởi filter `employer: employerId` ở `job.controller.ts` và `application.controller.ts`.
   - `getJobApplications` thực hiện N+1 query tới `SeekerProfile`; `applyToJob` và `uploadLogo` để sót file tạm trên đĩa hoặc upload ảnh mồ côi lên Cloudinary khi chưa có company.
2. **Nguyên nhân gốc rễ:** Thiếu hàm kiểm tra miền lương dùng chung cho cả create và partial update; thiếu cascade delete `Application` ở `deleteJob`; thiếu nhánh kiểm tra `role === "admin"`; kiểm tra điều kiện sau khi upload hoặc query trong vòng lặp `map`.
3. **Giải pháp & quy tắc phòng ngừa:**
   - Chuẩn hóa `validateSalaryRange` (kiểm tra `!== undefined`) và kiểm tra đối chiếu với bản ghi DB trong `updateJob`.
   - Bổ sung `Application.deleteMany({ job: job._id })` vào `deleteJob`.
   - Gom query `SeekerProfile.find({ user: { $in: seekerIds } })` thành 1 truy vấn duy nhất.
   - Dọn sạch file tạm trong mọi nhánh lỗi của `applyToJob` & `uploadLogo`, đồng thời kiểm tra tồn tại `Company` trước khi upload lên Cloudinary.
   - Sửa `getApplicationsAdmin` (bỏ `.populate("job", "title")` bị ghi đè, hỗ trợ tìm theo tên job và tên/email seeker) và `updateApplicationStatusByAdmin` (bảo toàn `viewedAt`, cập nhật `respondedAt` đúng).

---

## Chu kỳ 2 — Vòng 3 & Vòng 4 (Frontend API Client, Auth UX, Toast, Responsive Navbar & CSS)

### 6. `@ts-expect-error` ẩn lỗi kiểu, `fetch` thủ công & lệch shape API trong `frontend/src/lib/*`
1. **Triệu chứng lỗi:**
   - `frontend/src/lib/api.ts` dùng 5 `// @ts-expect-error` để đọc payload lỗi và log `NEXT_PUBLIC_API_URL` ra console trình duyệt.
   - `applyToJob` tự ghép `${API_BASE_URL}/api/...` bằng `fetch` thay vì dùng Axios instance, dễ nhân đôi `/api/api` nếu env đã chứa `/api` và bỏ qua cơ chế auto-refresh JWT token khi gặp `401`.
   - `getJobApplications` khai báo return type mảng trần thay vì `{ applications: Application[] }` khớp với Backend.
2. **Nguyên nhân gốc rễ:** Không dùng type guard `isRecord` cho response payload và không có helper `apiPostForm` hỗ trợ multipart FormData trên Axios instance dùng chung.
3. **Giải pháp & quy tắc phòng ngừa:** Tạo `ApiClientError`, type guard `isRecord`, `extractErrorMessage`, `getDisplayErrorMessage`, `isSafeRedirectPath`, `apiPostForm` (tự xóa header `Content-Type` khi `data instanceof FormData` trong interceptor), chuẩn hóa `applyToJob` / `getJobApplications` / `withdrawApplication` / `summarizeCandidate` / `deleteJob` / `toggleJobStatus`. Bổ sung test trong `frontend/src/lib/__tests__/api-utils.test.ts`.

### 7. Lỗi `react-hooks/set-state-in-effect`, empty interface & memory leak timer ở Frontend
1. **Triệu chứng lỗi:**
   - `ESLint` báo 5 errors: `AuthProvider.tsx` gọi `setUser` đồng bộ trong `useEffect`, `CTABanner.tsx` gọi `setIsVisible(false)` đồng bộ trong `useEffect` và không clear `setTimeout` khi unmount, `Skeleton.tsx` khai báo `interface SkeletonProps ... {}` rỗng.
   - `login/page.tsx` và `register/page.tsx` không bắt lỗi API trả về trong `onSubmit`, dùng dead link `<a href="#">` và `<option className="bg-slate-900">` khó đọc trên Light mode.
2. **Nguyên nhân gốc rễ:** Dùng `useEffect` để đồng bộ state phụ thuộc thay vì derived state; thiếu cơ chế Toast & ConfirmDialog dùng chung; bỏ sót `try/catch` khi gọi auth API.
3. **Giải pháp & quy tắc phòng ngừa:**
   - Chuyển `SkeletonProps` thành `type`.
   - Loại bỏ hoàn toàn `setState` đồng bộ trong `useEffect` của `AuthProvider.tsx`, `CTABanner.tsx`, và `Navbar.tsx` (dùng derived state `isVisible` / `mobileOpen` và `requestAnimationFrame` + cleanup `clearTimeout` / `cancelAnimationFrame`).
   - Xây dựng `ToastProvider` (cleanup toàn bộ timer khi unmount, kẹp biên viewport) và `ConfirmDialog`, cập nhật `login/page.tsx` (hỗ trợ `?error=`, `?redirect=` an toàn, toggle mật khẩu) và `register/page.tsx` (xác nhận mật khẩu, toggle mật khẩu, xử lý lỗi inline + toast).

### 8. Lỗi cú pháp CSS `oklch(var(--...))`, Navbar vỡ khung Mobile & thiếu Error Boundary
1. **Triệu chứng lỗi:**
   - `frontend/src/app/globals.css` viết `oklch(var(--primary) / 0.4)` (CSS không hợp lệ vì `var(--primary)` đã là giá trị `oklch(...)` hoàn chỉnh, khiến glow/shadow/link hover mất màu).
   - `Navbar.tsx` dồn toàn bộ links trên một hàng ngang gây tràn ngang ở màn hình 360px–390px.
   - Thiếu `error.tsx` và `not-found.tsx` chỉ hiển thị 1 dòng chữ thô tiếng Việt.
2. **Nguyên nhân gốc rễ:** Nhầm biến màu oklch trọn vẹn với kênh màu thô, và thiếu layout menu mobile cho Navbar.
3. **Giải pháp & quy tắc phòng ngừa:** Chuyển toàn bộ sang `color-mix(in oklch, var(--token) X%, transparent)` và `var(--primary)`; nâng cấp `Navbar.tsx` với sticky topbar + mobile hamburger drawer có `max-h` và `Escape` handler; tạo `frontend/src/app/error.tsx` và nâng cấp `frontend/src/app/not-found.tsx`.

---

## Chu kỳ 3 — Vòng 5 & Vòng 6 (Search Highlighting, Saved Jobs, Job Detail & AI Cover Letter)

### 9. Bug regex cờ `/g` (`lastIndex`) trong `JobCard.tsx`, key rác `diacriticPattern` & `overflow-hidden` cắt dropdown ở `page.tsx`
1. **Triệu chứng lỗi:**
   - Khi một từ khóa xuất hiện nhiều lần trong cùng tiêu đề, mô tả hoặc tên kỹ năng trên `JobCard.tsx`, chỉ các lần khớp lẻ (1, 3, 5...) được bôi sáng `<mark>`, các lần khớp chẵn (2, 4...) bị bỏ sót.
   - `page.tsx` chứa 3 key rác `"ui"`, `"ux"`, `"ui/ux"` trong `diacriticPattern` ánh xạ sai thành nhóm nguyên âm `[uùú...]`, làm hỏng highlight chữ có dấu khi gõ `ui`.
   - `page.tsx` đặt `overflow-hidden` ở root container làm dropdown gợi ý có thể bị cắt, `page=abc` sinh `NaN`, và bộ lọc lương tối thiểu/địa điểm không có debounce.
2. **Nguyên nhân gốc rễ:** Dùng chung một `RegExp` có cờ `"gi"` vừa để `text.split(regex)` vừa để `regex.test(part)` làm thay đổi thuộc tính stateful `lastIndex`; duplicate hàm `diacriticPattern` ở nhiều file.
3. **Giải pháp & quy tắc phòng ngừa:** Gom toàn bộ logic vào `frontend/src/lib/searchHighlight.ts` (`splitHighlightSegments` dùng `splitRegex` với `"gi"` và `exactRegex` KHÔNG có cờ `g`), `matchesKeyword`, `formatSalaryRange`, `parsePageParam`, `formatRelativeDate`; bọc blobs trang chủ trong lớp `overflow-hidden -z-10` riêng và đổi root container thành `overflow-x-clip`; tạo `useSavedJobs` dùng `useSyncExternalStore` với cached snapshot. Đã viết test hồi quy trong `frontend/src/lib/__tests__/search-highlight.test.ts`.

### 10. Thiếu guard đóng tuyển dụng, kiểm tra trùng đơn, validate file client & cảnh báo ESLint trong `jobs/[id]/page.tsx`
1. **Triệu chứng lỗi:**
   - Trang chi tiết công việc cho phép hiển thị form ứng tuyển ngay cả khi `job.isActive === false` hoặc người dùng đã ứng tuyển trước đó, dùng `alert()` cứng tiếng Việt, `accept=".pdf"` lệch với Backend (`.pdf,.doc,.docx`), và không kiểm tra giới hạn 1000 ký tự của `coverLetter` hay CV sẵn có trong hồ sơ.
   - `useEffect` trong `jobs/[id]/page.tsx` gây warning `react-hooks/exhaustive-deps`.
   - Lưu ý môi trường: Thư mục cache gitignored cũ `frontend/.next/dev/types/` (từ 6/10/2026) chứa import `InstantConfigForTypeCheckInternal` không còn tương thích với Next.js 16.0.10 khiến `tsc --noEmit` / `next build` báo 4 lỗi tại `.next/dev/types/app/*` dù `frontend/src/**` và `.next/types/**` sạch 0 lỗi (người dùng có thể xóa thư mục cache `.next/dev` khi chạy lại `next dev`).
2. **Nguyên nhân gốc rễ:** Thiếu kiểm tra trạng thái `isActive`, thiếu đồng bộ dữ liệu `getMyApplications()` + `getMyProfile()`, thiếu validation client và sử dụng `fetchJob` không memo hóa trong `useEffect`.
3. **Giải pháp & quy tắc phòng ngừa:** Viết lại `frontend/src/app/jobs/[id]/page.tsx` dùng `fetchKey` effect sạch (0 lỗi & 0 cảnh báo ESLint), validate file PDF/DOC/DOCX `<= 5MB`, hiển thị bộ đếm `1000` ký tự, tự nhận diện đơn đã nộp + CV sẵn có trong hồ sơ, tích hợp AI tạo Cover Letter (có tự cắt gọn an toàn `<= 1000` ký tự), nút Bookmark/Share và mục Việc làm liên quan.

---

## Chu kỳ 4 — Vòng 7 & Vòng 8 (Candidate Profile, Company Profile & Employer Dashboard)

### 11. Thiếu xử lý lỗi/loading & bug `+"" === 0` khi nhập lương trong `profile`, `company`, `dashboard`
1. **Triệu chứng lỗi:**
   - `profile/page.tsx` chỉ cho phép sửa `bio` và `skills`, bỏ qua `phone`, `location`, `experience`, `education`, links và upload Avatar/CV; không bắt lỗi `updateMyProfile`.
   - `company/page.tsx` gọi `getMyCompany()` kể cả khi user chưa xác nhận là `employer`, thiếu `location`, `industry`, `size`, upload logo và bỏ sót `try/catch` khi lưu.
   - `dashboard/page.tsx` dùng `+event.target.value` khiến việc xóa rỗng ô lương bị ép về `0` thay vì `undefined`, dùng `alert()`, không quản lý được danh sách tin đã đăng (edit/close/delete) và không có màn hình quản lý ứng viên theo vị trí.
2. **Nguyên nhân gốc rễ:** Thiếu helper validate dùng chung (`profileUtils`), thiếu hàm API client `uploadAvatar`, `uploadResume`, `uploadCompanyLogo`, `deleteJob`, `toggleJobStatus`, `generateJobDescription`, `summarizeCandidate`, và thiếu cơ chế guard role / `ConfirmDialog` đồng bộ.
3. **Giải pháp & quy tắc phòng ngừa:**
   - Tạo `frontend/src/lib/profileUtils.ts` (`calculateProfileCompleteness`, `calculateSkillMatch`, `isValidOptionalHttpUrl`, `validateJobSalaryInputs` chuyển chuỗi rỗng thành `undefined` và kiểm tra ngưỡng lương) kèm unit test trong `frontend/src/lib/__tests__/profile-utils.test.ts`.
   - Nâng cấp `profile/page.tsx` (đủ 9 field, thanh độ hoàn thiện, skill tag chips, upload Avatar/CV bằng `next/image` unoptimized) và `company/page.tsx` (guard role, logo upload sau khi có company, Live Preview card).
   - Viết lại `dashboard/page.tsx` thành 3 tabs hoàn chỉnh (`my-jobs`, `form` create/edit + AI tạo JD, `applicants` + skill match + AI tóm tắt ứng viên).

---

## Chu kỳ 5 — Vòng 9 & Vòng 10 (Applications Center & Admin Analytics Dashboard)

### 12. Crash `a.job === null`, rò rỉ request Admin không phân quyền & thiếu xử lý lỗi trên `/applications` và `/admin`
1. **Triệu chứng lỗi:**
   - `applications/page.tsx` gọi trực tiếp `a.job.title` / `a.job._id` qua helper thiếu kiểm tra null nên dễ crash nếu gặp đơn ứng tuyển trỏ tới job đã xóa; dùng `<a href>`, không có filter trạng thái, không có timeline tiến độ, không có nút rút đơn cho Seeker và thiếu chức năng duyệt đơn/AI tóm tắt cho Employer/Admin.
   - `admin/page.tsx` không kiểm tra `user?.role === "admin"` trước khi gọi các endpoint `/admin/*` (gây loạt lỗi 401/403 khi mở nhầm trang); `useAdminList` không có `catch` nên màn hình bị treo hoặc nuốt lỗi; cho phép chọn thao tác trên chính tài khoản admin đang đăng nhập; bảng vỡ khung trên mobile và thiếu tab thống kê `/api/admin/stats` + phân trang + tìm kiếm/lọc.
2. **Nguyên nhân gốc rễ:** Thiếu helper null-safe cho dữ liệu tham chiếu không đồng nhất (`string | object | null`), thiếu RBAC guard ở lớp Page, thiếu error boundary/retry trong hook list và không bọc bảng trong container cuộn ngang `overflow-x-auto`.
3. **Giải pháp & quy tắc phòng ngừa:**
   - Tạo `frontend/src/lib/applicationUtils.ts` (`safeGetJobInfo`, `safeGetSeekerInfo`, `canWithdrawApplication`, `countApplicationsByStatus`, `getApplicationTimelineStep`) kèm unit test trong `frontend/src/lib/__tests__/application-utils.test.ts`.
   - Viết lại `applications/page.tsx` hỗ trợ đa vai trò (Seeker xem timeline & rút đơn kèm `ConfirmDialog`; Employer/Admin tìm kiếm, lọc theo 5 trạng thái, đổi trạng thái và tóm tắt ứng viên bằng AI).
   - Mở rộng `admin.ts` (`adminGetStats` + filter params) và viết lại `admin/page.tsx` với RBAC guard nghiêm ngặt (chặn mọi request `/admin/*` nếu không phải admin), 5 tabs gồm Overview Analytics (4 KPI cards, 2 biểu đồ thanh ngang, hoạt động gần nhất) và 4 bảng quản trị có search debounce, filter, pagination, bảo vệ self-modification (`You` badge), `overflow-x-auto`, và `ConfirmDialog`.


---

### 13. Việc làm đã lưu bị rò rỉ giữa các tài khoản khác nhau trên cùng trình duyệt
1. **Triệu chứng:** Đăng nhập tài khoản Google và lưu (bookmark) một việc làm, sau đó đăng xuất rồi đăng nhập tài khoản khác (`dev@example.com`), mục "Việc đã lưu" vẫn hiển thị việc làm đã lưu của tài khoản trước đó.
2. **Nguyên nhân gốc rễ:** Hook `frontend/src/hooks/useSavedJobs.ts` sử dụng duy nhất một key toàn cục cố định `job_portal_saved_jobs` trong `localStorage` và một cặp biến cache module đơn (`cachedRaw`/`cachedJobs`), không phân tách theo danh tính người dùng đang đăng nhập.
3. **Giải pháp & quy tắc phòng ngừa:**
   - Xuất hàm `getSavedJobsStorageKey(userId)` tạo key riêng theo tài khoản (`job_portal_saved_jobs:<userId>` khi đã đăng nhập, `job_portal_saved_jobs:guest` khi chưa đăng nhập) và gắn `useAuth()` vào `useSavedJobs`.
   - Đổi snapshot cache sang `Map<string, { raw, jobs }>` theo từng `storageKey` để giữ nguyên tính bất biến tham chiếu cho `useSyncExternalStore` mà không bị dính dữ liệu khi chuyển tài khoản.
   - **Quy tắc phòng ngừa:** Mọi dữ liệu client-side gắn với hành vi người dùng (`localStorage`/`sessionStorage`) bắt buộc phải namespace theo `user._id` (hoặc xóa sạch khi đổi phiên đăng nhập).

---

### 14. Xem CV PDF vừa upload lên Cloudinary báo "Lỗi - Không tải được tài liệu PDF" (HTTP 401)
1. **Triệu chứng:** Ứng viên upload file `.pdf` thật lên Cloudinary thành công, nhưng khi bấm "Xem CV" / "CV hiện tại" mở trực tiếp link `https://res.cloudinary.com/<cloud>/raw/upload/...pdf`, trình xem PDF của Chrome báo lỗi "Không tải được tài liệu PDF".
2. **Nguyên nhân gốc rễ:** Kiểm tra header thực tế từ Cloudinary trả về `HTTP 401 Unauthorized` kèm `x-cld-error: deny or ACL failure` (do tài khoản Cloudinary mặc định khóa phân phối công khai file PDF/ZIP ở mức CDN, kể cả với URL ký `sign_url: true`). Trong khi đó, endpoint tải có xác thực `cloudinary.utils.private_download_url` trả về `200 OK` cùng đầy đủ dữ liệu PDF.
3. **Giải pháp & quy tắc phòng ngừa:**
   - Thêm hàm `parseCloudinaryRawUrl`, `inferResumeMimeType`, `sanitizeResumeFilename`, và `fetchResumeAsset` trong `backend/src/services/cloudinary.service.ts` để tự động dùng `cloudinary.utils.private_download_url` (hết hạn 120s) đối với file thuộc cloud của ứng dụng và chặn SSRF với URL ngoài.
   - Bổ sung 2 endpoint stream CV có kiểm tra RBAC ở backend: `GET /api/profile/seeker/resume` và `GET /api/applications/:applicationId/resume` (trả `Content-Type` chuẩn và `Content-Disposition: inline`).
   - Cập nhật toàn bộ 4 nút xem CV trên frontend (`/profile`, `/jobs/[id]`, `/applications`, `/dashboard`) trỏ qua 2 endpoint backend thay vì mở trực tiếp CDN URL công khai.
   - **Quy tắc phòng ngừa:** Không mở trực tiếp link `raw/upload/*.pdf` của Cloudinary từ trình duyệt mà không qua kiểm chứng delivery policy; luôn phục vụ tài liệu nhạy cảm (CV ứng viên) qua endpoint backend có xác thực và phân quyền RBAC.


---

### 15. Nút "+ Thêm" kỹ năng và "+ Thêm yêu cầu" trong Dashboard/Profile không có phản hồi khi ô trống hoặc nhập trùng
1. **Triệu chứng:** Trên form tạo/sửa việc làm (`/dashboard`) và hồ sơ (`/profile`), khi người dùng bấm nút **"+ Thêm"** hoặc **"+ Thêm yêu cầu"** lúc ô nhập đang trống (hoặc nhập kỹ năng bị trùng), nút không hề có phản hồi gì (không focus ô nhập, không hiện thông báo), gây cảm giác nút bị liệt không hoạt động; ngoài ra nội dung đang gõ dở nếu quên bấm "+ Thêm" sẽ bị bỏ sót khi submit form.
2. **Nguyên nhân gốc rễ:** Các hàm `addSkill` và `addRequirement` chỉ `if (!trimmed) return;` và im lặng bỏ qua khi trùng lặp; `handleSubmitJob` chỉ gửi `form.skills` / `form.requirements` mà không gộp text đang nhập dở; sự kiện `onKeyDown` chưa kiểm tra `event.nativeEvent.isComposing` cho bộ gõ tiếng Việt.
3. **Giải pháp & quy tắc phòng ngừa:**
   - Gắn `ref` vào ô nhập kỹ năng và yêu cầu; khi bấm "+ Thêm" lúc ô trống hoặc kỹ năng đã tồn tại sẽ tự động focus lại ô nhập và hiện toast hướng dẫn rõ ràng.
   - Hỗ trợ nhập nhanh nhiều kỹ năng cách nhau bằng dấu phẩy (`,`), tự động gộp text đang nhập dở khi submit form tạo/sửa job, và kiểm tra `!event.nativeEvent.isComposing` khi nhấn Enter.
   - **Quy tắc phòng ngừa:** Mọi nút hành động bị chặn do input rỗng hoặc trùng lặp phải luôn cung cấp phản hồi trực quan (toast/inline message + focus ô nhập), tuyệt đối không `return` im lặng.
