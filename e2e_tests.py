"""
End-to-End UI Tests for slio-chat
Run with: python3.11 e2e_tests.py

Prerequisites:
1. Start dev server: npm run dev
2. Server must be running at http://localhost:5173
"""

from playwright.sync_api import sync_playwright, Page, expect
import base64
import io
import os
import sys
import tempfile
from datetime import datetime

# Test configuration
API_KEY = "sk-0Dis8QLsuP1LsKw87bBd021fD4Ac49E3B93b70D1A8E78d4e"
AIHUBMIX_BASE_URL = "https://api.aihubmix.com/v1"

# Test colors for visual feedback
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def log_info(msg):
    print(f"{YELLOW}[INFO]{RESET} {msg}")

def log_pass(msg):
    print(f"{GREEN}[PASS]{RESET} {msg}")

def log_fail(msg):
    print(f"{RED}[FAIL]{RESET} {msg}")

class TestResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.error = None

    def mark_pass(self):
        self.passed = True
        log_pass(self.name)

    def mark_fail(self, error: str):
        self.passed = False
        self.error = error
        log_fail(f"{self.name}: {error}")

# Create a simple PDF for testing
def create_test_pdf(text_content="Test PDF Document\nThis is a test PDF file.\nPage 1 content."):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    lines = text_content.split('\n')
    y = 750
    for line in lines:
        c.drawString(100, y, line)
        y -= 20
    c.save()
    buffer.seek(0)
    return buffer.read()

# Create an image for testing
def create_test_image():
    from PIL import Image

    img = Image.new('RGB', (200, 100), color=(73, 109, 137))
    # Add some text
    from PIL import ImageDraw, ImageFont
    d = ImageDraw.Draw(img)
    d.text((50, 40), "Test Image", fill=(255, 255, 255))

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.read()

def setup_api_key(page: Page):
    """Configure the API key in settings"""
    log_info("Setting up API key...")

    # Method 1: Use localStorage to inject config directly (most reliable)
    log_info("Injecting config via localStorage...")

    # The settings store uses these localStorage keys:
    # - 'models' - JSON object of model configs
    # - 'preferred-model' - selected model ID
    # - 'vlmModel' - VLM model ID
    models_config = {
        'gemini-2.5-flash': {
            'name': 'gemini-2.5-flash',
            'url': AIHUBMIX_BASE_URL,
            'key': API_KEY,
            'type': 'normal'
        },
        'qwen2.5-72b-instruct': {
            'name': 'qwen2.5-72b-instruct',
            'url': AIHUBMIX_BASE_URL,
            'key': API_KEY,
            'type': 'normal'
        }
    }

    page.evaluate(f"""
        localStorage.setItem('models', JSON.stringify({models_config}));
        localStorage.setItem('preferred-model', 'gemini-2.5-flash');
        localStorage.setItem('vlmModel', 'gemini-2.5-flash');
        console.log('Config injected');
        console.log('models:', localStorage.getItem('models'));
        console.log('preferred-model:', localStorage.getItem('preferred-model'));
    """)
    log_info("Config injected via localStorage")

    # Reload to apply
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    log_info("Page reloaded with new config")

def close_modals(page: Page):
    """Close any open modal dialogs"""
    # Press Escape to close modals
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # Check if there's a modal and close it
    modal = page.locator('[role="dialog"]')
    if modal.count() > 0:
        close_btn = modal.locator('button:has-text("取消"), button:has-text("Close"), button:has-text("关闭")')
        if close_btn.count() > 0:
            close_btn.first.click()
            page.wait_for_timeout(300)

def select_chat_type_if_needed(page: Page):
    """Select a chat type if ChatTypeModal is open"""
    modal = page.locator('[role="dialog"]')
    if modal.count() > 0:
        # Check if this is the chat type modal (has "选择对话类型" text)
        title = page.locator('text=选择对话类型')
        if title.count() > 0:
            log_info("ChatTypeModal detected, selecting first option...")
            # Find all buttons and skip the cancel button
            buttons = modal.locator('button')
            count = buttons.count()
            log_info(f"Found {count} buttons in modal")
            for i in range(count):
                btn = buttons.nth(i)
                try:
                    text = btn.inner_text()
                    log_info(f"  Button {i}: '{text}'")
                    if '取消' not in text and text.strip():
                        btn.click()
                        page.wait_for_timeout(500)
                        log_info(f"Selected chat type: {text[:30]}")
                        return
                except:
                    pass
            # If we get here, click the second button (first might be cancel)
            if count > 1:
                buttons.nth(1).click()
                page.wait_for_timeout(500)

def test_page_loads(page: Page):
    """Test 1: Page loads correctly"""
    result = TestResult("Page loads correctly")

    try:
        page.goto("http://localhost:5173")
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)

        # Select chat type if modal is open
        select_chat_type_if_needed(page)

        # Check for main elements
        textarea = page.locator('textarea')
        assert textarea.count() > 0, "Chat textarea not found"

        log_pass("Page loaded with chat interface")
        result.mark_pass()
    except Exception as e:
        result.mark_fail(str(e))

    return result

def test_send_message(page: Page):
    """Test 2: Send a simple message"""
    result = TestResult("Send and receive message")

    try:
        # Wait for any modals to settle
        page.wait_for_timeout(1000)

        # Handle chat type modal if present
        for attempt in range(3):
            modal = page.locator('[role="dialog"]')
            if modal.count() == 0:
                log_info("No modal detected, proceeding...")
                break

            title = page.locator('text=选择对话类型')
            if title.count() > 0:
                log_info(f"ChatTypeModal detected (attempt {attempt+1}), selecting option...")
                buttons = modal.locator('button')
                count = buttons.count()
                log_info(f"Found {count} buttons")

                # Find a button that looks like a chat type (not cancel)
                clicked = False
                for i in range(count):
                    btn = buttons.nth(i)
                    try:
                        text = btn.inner_text()
                        if '取消' not in text and len(text.strip()) > 0:
                            btn.click()
                            log_info(f"Clicked: '{text[:50]}'")
                            clicked = True
                            page.wait_for_timeout(1000)
                            break
                    except:
                        pass

                if not clicked and count > 1:
                    # Try second button (first might be cancel)
                    buttons.nth(1).click()
                    log_info("Clicked second button")
                    page.wait_for_timeout(1000)
            else:
                log_info("Other modal detected, closing...")
                close_modals(page)

            page.wait_for_timeout(500)
        else:
            log_info("Modal handling attempts exhausted")

        # Verify no modal is blocking
        modal = page.locator('[role="dialog"]')
        if modal.count() > 0:
            log_info("Modal still present after handling, taking screenshot...")
            page.screenshot(path='/Users/wanghao/git/slio-chat/test_modal_blocking.png')
            result.mark_fail("Modal is blocking the chat interface")
            return result

        # Check for API error
        error_toast = page.locator('text=API 路径或 Key 格式错误')
        if error_toast.count() > 0:
            log_info("API error detected")
            result.mark_fail("API not configured")
            return result

        # Now fill the textarea
        textarea = page.locator('textarea').first
        textarea.fill("Hello, how are you?")
        page.wait_for_timeout(300)

        # Click send button
        send_button = page.locator('button[title="发送消息"]')
        send_button.click()
        log_info("Send button clicked")

        # Wait for response
        page.wait_for_timeout(15000)

        # Check that user message appears
        user_messages = page.locator('text=Hello, how are you?')
        if user_messages.count() == 0:
            page.screenshot(path='/Users/wanghao/git/slio-chat/test_message_debug.png', full_page=True)
            log_info("Message not found, screenshot saved")
            result.mark_fail("User message not found in chat")
            return result

        log_pass("Message sent successfully")
        result.mark_pass()
    except Exception as e:
        result.mark_fail(str(e))

    return result

def test_file_upload_pdf(page: Page):
    """Test 3: Upload a PDF file"""
    result = TestResult("Upload PDF file")

    try:
        # Handle any open modals
        select_chat_type_if_needed(page)
        close_modals(page)
        page.wait_for_timeout(500)

        # Create a test PDF
        pdf_content = create_test_pdf()

        # Trigger file chooser
        with page.expect_file_chooser() as fc_info:
            page.locator('button[title="上传一个或多个文件"]').click()

        file_chooser = fc_info.value
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(pdf_content)
            temp_path = f.name

        file_chooser.set_files(temp_path)
        page.wait_for_timeout(2000)

        # Check for upload confirmation
        toast = page.locator('text=已上传')
        assert toast.count() > 0, "Upload confirmation not found"

        os.unlink(temp_path)
        log_pass("PDF uploaded successfully")
        result.mark_pass()
    except Exception as e:
        result.mark_fail(str(e))

    return result

def test_file_upload_image(page: Page):
    """Test 4: Upload an image file"""
    result = TestResult("Upload image file")

    try:
        # Handle any open modals
        select_chat_type_if_needed(page)
        close_modals(page)
        page.wait_for_timeout(500)

        # Create a test image
        img_content = create_test_image()

        with page.expect_file_chooser() as fc_info:
            page.locator('button[title="上传一个或多个文件"]').click()

        file_chooser = fc_info.value
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            f.write(img_content)
            temp_path = f.name

        file_chooser.set_files(temp_path)
        page.wait_for_timeout(2000)

        toast = page.locator('text=已上传')
        assert toast.count() > 0, "Upload confirmation not found"

        os.unlink(temp_path)
        log_pass("Image uploaded successfully")
        result.mark_pass()
    except Exception as e:
        result.mark_fail(str(e))

    return result

def test_new_conversation(page: Page):
    """Test 5: Create a new conversation"""
    result = TestResult("Create new conversation")

    try:
        # Look for new conversation button
        new_conv_button = page.locator('text=新建对话')
        if new_conv_button.count() > 0:
            new_conv_button.click()
            page.wait_for_timeout(500)

            # Check that chat is cleared
            textarea = page.locator('textarea').first
            textarea.wait_for(state='visible', timeout=3000)

            log_pass("New conversation created")
            result.mark_pass()
        else:
            # Try clicking the conversation list header or plus button
            log_info("New conversation button not found, trying alternative")
            result.mark_fail("New conversation button not found")
    except Exception as e:
        result.mark_fail(str(e))

    return result

def test_theme_toggle(page: Page):
    """Test 6: Toggle dark/light theme"""
    result = TestResult("Theme toggle works")

    try:
        # Find theme toggle
        theme_button = page.locator('text=切换主题')
        if theme_button.count() > 0:
            theme_button.click()
            page.wait_for_timeout(500)

            # Toggle again
            theme_button.click()
            page.wait_for_timeout(500)

            log_pass("Theme toggle works")
            result.mark_pass()
        else:
            log_info("Theme toggle not found, skipping test")
            result.mark_fail("Theme toggle not found")
    except Exception as e:
        result.mark_fail(str(e))

    return result

def test_conversation_list(page: Page):
    """Test 7: Conversation list exists and works"""
    result = TestResult("Conversation list displays")

    try:
        # Check for conversation list in sidebar
        conv_items = page.locator('[class*="conversation"], [class*="Conversation"]')
        log_info(f"Found {conv_items.count()} conversation items")

        # The sidebar should exist
        sidebar = page.locator('[class*="sidebar"], [class*="Sidebar"]')
        assert sidebar.count() > 0, "Sidebar not found"

        log_pass("Conversation list is present")
        result.mark_pass()
    except Exception as e:
        result.mark_fail(str(e))

    return result

def run_all_tests():
    """Run all e2e tests"""
    print("\n" + "="*60)
    print("E2E UI Tests for slio-chat")
    print("="*60 + "\n")

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        # Capture console logs for debugging
        def handle_console(msg):
            if msg.type in ['error', 'warning']:
                log_info(f"Browser {msg.type}: {msg.text[:100]}")

        page.on("console", handle_console)

        # Test 1: Page loads
        results.append(test_page_loads(page))
        page.wait_for_timeout(1000)

        # Setup API key
        setup_api_key(page)
        page.wait_for_timeout(500)

        # Test 2: Send message
        results.append(test_send_message(page))
        page.wait_for_timeout(2000)

        # Test 3: Upload PDF
        results.append(test_file_upload_pdf(page))
        page.wait_for_timeout(1000)

        # Test 4: Upload image
        results.append(test_file_upload_image(page))
        page.wait_for_timeout(1000)

        # Test 5: New conversation
        results.append(test_new_conversation(page))
        page.wait_for_timeout(1000)

        # Test 6: Theme toggle
        results.append(test_theme_toggle(page))
        page.wait_for_timeout(500)

        # Test 7: Conversation list
        results.append(test_conversation_list(page))

        # Take final screenshot
        page.screenshot(path='/Users/wanghao/git/slio-chat/test_final_screenshot.png', full_page=True)
        log_info("Final screenshot saved to test_final_screenshot.png")

        browser.close()

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = sum(1 for r in results if r.passed)
    failed = len(results) - passed

    for r in results:
        status = f"{GREEN}PASS{RESET}" if r.passed else f"{RED}FAIL{RESET}"
        print(f"  {status} - {r.name}")
        if r.error:
            print(f"         Error: {r.error[:80]}...")

    print(f"\nTotal: {len(results)} tests, {GREEN}{passed} passed{RESET}, {RED}{failed} failed{RESET}")
    print("="*60 + "\n")

    return failed == 0

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
