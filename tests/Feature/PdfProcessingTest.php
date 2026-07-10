<?php

namespace Tests\Feature;

use App\Services\PdfFormattingService;
use Tests\TestCase;

class PdfProcessingTest extends TestCase
{
    protected string $tempInput;
    protected string $tempOutput;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempInput = tempnam(sys_get_temp_dir(), 'test_input_') . '.pdf';
        $this->tempOutput = tempnam(sys_get_temp_dir(), 'test_output_') . '.pdf';

        // Generate a valid 1-page PDF using TCPDF for testing
        $pdf = new \TCPDF();
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->AddPage();
        
        // Write 11 lines to test tenth line triggers
        $text = "";
        for ($i = 1; $i <= 12; $i++) {
            $text .= "This is line number {$i} of the sample document.\n";
        }
        $pdf->Write(5, $text);
        $pdf->Output($this->tempInput, 'F');
    }

    protected function tearDown(): void
    {
        if (file_exists($this->tempInput)) {
            unlink($this->tempInput);
        }
        if (file_exists($this->tempOutput)) {
            unlink($this->tempOutput);
        }

        parent::tearDown();
    }

    /**
     * Test page count detection.
     */
    public function test_pdf_page_count_detection()
    {
        $service = new PdfFormattingService();
        $pageCount = $service->getPageCount($this->tempInput);

        $this->assertEquals(1, $pageCount);
    }

    /**
     * Test formatting process (page numbers and tenth lining).
     */
    public function test_pdf_formatting_stamps_successfully()
    {
        $service = new PdfFormattingService();

        $pageNumberSettings = [
            'enabled' => true,
            'position' => 'top-right',
            'font' => 'Helvetica',
            'font_size' => 12,
            'colour' => '#ff0000',
            'bold' => true,
            'italic' => false,
            'starting_number' => 1
        ];

        $tenthLineSettings = [
            'enabled' => true,
            'font' => 'Helvetica',
            'font_size' => 10,
            'colour' => '#0000ff',
            'bold' => true,
            'right_margin' => 10,
            'top_offset' => 0
        ];

        // Mock coordinates for line Y positions (first page)
        $lineCoordinates = [
            // Page 1 Y-percentages (10 lines)
            [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]
        ];

        $success = $service->format(
            $this->tempInput,
            $this->tempOutput,
            $pageNumberSettings,
            $tenthLineSettings,
            $lineCoordinates
        );

        $this->assertTrue($success);
        $this->assertFileExists($this->tempOutput);
        $this->assertGreaterThan(0, filesize($this->tempOutput));
    }
}
